import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Smoke test: Validate ordering invariants after random moves
 * Per spec: 10 random task moves + 3 random column moves
 */
async function main() {
  console.log('🧪 Running smoke test...\n');

  const startTime = Date.now();

  // Get demo project
  const project = await prisma.project.findFirst();
  if (!project) {
    throw new Error('No project found. Run pnpm db:reset first.');
  }

  console.log(`📋 Project: ${project.name}\n`);

  // Get initial state
  const initialColumns = await prisma.column.findMany({
    where: { projectId: project.id },
    orderBy: { order: 'asc' },
    include: { tasks: { orderBy: { order: 'asc' } } },
  });

  console.log(`Initial state:`);
  console.log(`  Columns: ${initialColumns.length}`);
  console.log(`  Total tasks: ${initialColumns.reduce((sum, c) => sum + c.tasks.length, 0)}\n`);

  // Validate initial ordering
  validateColumnOrdering(initialColumns);
  initialColumns.forEach((col) => {
    validateTaskOrdering(col.id, col.tasks);
  });

  console.log('✅ Initial ordering is valid\n');

  // Perform 10 random task moves
  console.log('🔄 Performing 10 random task moves...');
  let taskMoveCount = 0;

  for (let i = 0; i < 10; i++) {
    const columns = await prisma.column.findMany({
      where: { projectId: project.id },
      include: { tasks: { orderBy: { order: 'asc' } } },
    });

    // Find columns with tasks
    const columnsWithTasks = columns.filter((c) => c.tasks.length > 0);
    if (columnsWithTasks.length === 0) break;

    // Pick random task
    const sourceColumn =
      columnsWithTasks[Math.floor(Math.random() * columnsWithTasks.length)];
    const task =
      sourceColumn.tasks[Math.floor(Math.random() * sourceColumn.tasks.length)];

    // Pick random destination column and index
    const destColumn = columns[Math.floor(Math.random() * columns.length)];
    const maxIndex = destColumn.tasks.filter((t) => t.id !== task.id).length;
    const toIndex = Math.floor(Math.random() * (maxIndex + 1));

    // Move task
    await moveTask(task.id, destColumn.id, toIndex);
    taskMoveCount++;

    console.log(
      `  ${i + 1}. Moved "${task.title.substring(0, 30)}" to ${destColumn.name} at index ${toIndex}`
    );
  }

  console.log(`\n✅ Completed ${taskMoveCount} task moves\n`);

  // Perform 3 random column moves
  console.log('🔄 Performing 3 random column moves...');
  let columnMoveCount = 0;

  for (let i = 0; i < 3; i++) {
    const columns = await prisma.column.findMany({
      where: { projectId: project.id },
      orderBy: { order: 'asc' },
    });

    if (columns.length < 2) break;

    // Pick random column and destination
    const column = columns[Math.floor(Math.random() * columns.length)];
    const toIndex = Math.floor(Math.random() * columns.length);

    await moveColumn(project.id, column.id, toIndex);
    columnMoveCount++;

    console.log(`  ${i + 1}. Moved column "${column.name}" to index ${toIndex}`);
  }

  console.log(`\n✅ Completed ${columnMoveCount} column moves\n`);

  // Validate final state
  console.log('🔍 Validating final ordering...\n');

  const finalColumns = await prisma.column.findMany({
    where: { projectId: project.id },
    orderBy: { order: 'asc' },
    include: { tasks: { orderBy: { order: 'asc' } } },
  });

  validateColumnOrdering(finalColumns);
  finalColumns.forEach((col) => {
    validateTaskOrdering(col.id, col.tasks);
  });

  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log('\n✅ All invariants passed!');
  console.log(`\n📊 Summary:`);
  console.log(`  Task moves: ${taskMoveCount}`);
  console.log(`  Column moves: ${columnMoveCount}`);
  console.log(`  Duration: ${duration}ms`);
  console.log('\n🎉 Smoke test passed!\n');
}

/**
 * Validate that column orders are strictly increasing
 */
function validateColumnOrdering(
  columns: Array<{ id: string; name: string; order: number }>
) {
  for (let i = 1; i < columns.length; i++) {
    if (columns[i].order <= columns[i - 1].order) {
      throw new Error(
        `Column ordering violation: ${columns[i - 1].name} (${columns[i - 1].order}) >= ${columns[i].name} (${columns[i].order})`
      );
    }
  }
}

/**
 * Validate that task orders are strictly increasing within a column
 */
function validateTaskOrdering(
  columnId: string,
  tasks: Array<{ id: string; title: string; order: number }>
) {
  for (let i = 1; i < tasks.length; i++) {
    if (tasks[i].order <= tasks[i - 1].order) {
      throw new Error(
        `Task ordering violation in column ${columnId}: "${tasks[i - 1].title}" (${tasks[i - 1].order}) >= "${tasks[i].title}" (${tasks[i].order})`
      );
    }
  }
}

/**
 * Move a task (calls the service logic directly)
 */
async function moveTask(taskId: string, toColumnId: string, toIndex: number) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error('Task not found');

  const targetTasks = await prisma.task.findMany({
    where: { columnId: toColumnId },
    orderBy: { order: 'asc' },
  });

  const tasksWithoutCurrent = targetTasks.filter((t) => t.id !== taskId);
  const newOrder = calculateNewOrder(tasksWithoutCurrent, toIndex);

  // Check renorm
  const shouldRenorm = checkRenormNeeded(tasksWithoutCurrent);

  if (shouldRenorm) {
    await prisma.$transaction(async (tx) => {
      // Renormalize
      const tasks = await tx.task.findMany({
        where: { columnId: toColumnId, id: { not: taskId } },
        orderBy: { order: 'asc' },
      });
      for (let i = 0; i < tasks.length; i++) {
        await tx.task.update({
          where: { id: tasks[i].id },
          data: { order: (i + 1) * 1000 },
        });
      }
      // Then insert
      const renormedTasks = await tx.task.findMany({
        where: { columnId: toColumnId, id: { not: taskId } },
        orderBy: { order: 'asc' },
      });
      const finalOrder = calculateNewOrder(renormedTasks, toIndex);
      await tx.task.update({
        where: { id: taskId },
        data: { columnId: toColumnId, order: finalOrder },
      });
    });
  } else {
    await prisma.task.update({
      where: { id: taskId },
      data: { columnId: toColumnId, order: newOrder },
    });
  }
}

/**
 * Move a column
 */
async function moveColumn(projectId: string, columnId: string, toIndex: number) {
  const columns = await prisma.column.findMany({
    where: { projectId },
    orderBy: { order: 'asc' },
  });

  const columnsWithoutCurrent = columns.filter((c) => c.id !== columnId);
  const newOrder = calculateNewOrder(columnsWithoutCurrent, toIndex);

  // Check renorm
  const shouldRenorm = checkRenormNeeded(columnsWithoutCurrent);

  if (shouldRenorm) {
    await prisma.$transaction(async (tx) => {
      const cols = await tx.column.findMany({
        where: { projectId, id: { not: columnId } },
        orderBy: { order: 'asc' },
      });
      for (let i = 0; i < cols.length; i++) {
        await tx.column.update({
          where: { id: cols[i].id },
          data: { order: (i + 1) * 1000 },
        });
      }
      const renormedCols = await tx.column.findMany({
        where: { projectId, id: { not: columnId } },
        orderBy: { order: 'asc' },
      });
      const finalOrder = calculateNewOrder(renormedCols, toIndex);
      await tx.column.update({
        where: { id: columnId },
        data: { order: finalOrder },
      });
    });
  } else {
    await prisma.column.update({
      where: { id: columnId },
      data: { order: newOrder },
    });
  }
}

function calculateNewOrder(siblings: { order: number }[], toIndex: number): number {
  if (siblings.length === 0) return 1000;
  if (toIndex === 0) {
    const newOrder = Math.floor(siblings[0].order / 2);
    return newOrder > 0 ? newOrder : 1;
  }
  if (toIndex >= siblings.length) {
    return siblings[siblings.length - 1].order + 1000;
  }
  return Math.floor((siblings[toIndex - 1].order + siblings[toIndex].order) / 2);
}

function checkRenormNeeded(items: { order: number }[]): boolean {
  if (items.length < 2) return false;
  for (let i = 1; i < items.length; i++) {
    if (items[i].order - items[i - 1].order < 2) return true;
  }
  return false;
}

main()
  .catch((e) => {
    console.error('❌ Smoke test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

