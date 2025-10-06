import { PrismaClient, Task } from '@prisma/client';
import { createTRPCError } from '../trpc';

/**
 * Move task to a new position (possibly different column)
 * Uses sparse Int ordering with renormalization when needed
 */
export async function moveTask(
  prisma: PrismaClient,
  taskId: string,
  toColumnId: string,
  toIndex: number
): Promise<Task> {
  // Validate task exists
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });
  if (!task) {
    throw createTRPCError('NOT_FOUND', 'Task not found');
  }

  // Validate target column exists
  const targetColumn = await prisma.column.findUnique({
    where: { id: toColumnId },
  });
  if (!targetColumn) {
    throw createTRPCError('NOT_FOUND', 'Target column not found');
  }

  // Get all tasks in target column sorted by order
  const targetTasks = await prisma.task.findMany({
    where: { columnId: toColumnId },
    orderBy: { order: 'asc' },
  });

  // If moving within same column to same index, it's a no-op
  if (task.columnId === toColumnId) {
    const currentIndex = targetTasks.findIndex((t) => t.id === taskId);
    if (currentIndex === toIndex) {
      return task;
    }
  }

  // Filter out the current task from the target list if it's already there
  const tasksWithoutCurrent = targetTasks.filter((t) => t.id !== taskId);

  // Validate toIndex
  if (toIndex < 0 || toIndex > tasksWithoutCurrent.length) {
    throw createTRPCError('BAD_REQUEST', 'Invalid toIndex');
  }

  // Calculate new order
  const newOrder = calculateNewOrder(tasksWithoutCurrent, toIndex);

  // Check if renormalization is needed
  const shouldRenorm = checkRenormNeeded(tasksWithoutCurrent);

  return prisma.$transaction(async (tx) => {
    if (shouldRenorm) {
      // Renormalize all tasks in the column
      await renormalizeTasks(tx, toColumnId, taskId);
      // Recalculate order after renorm
      const renormedTasks = await tx.task.findMany({
        where: { columnId: toColumnId, id: { not: taskId } },
        orderBy: { order: 'asc' },
      });
      const finalOrder = calculateNewOrder(renormedTasks, toIndex);
      return tx.task.update({
        where: { id: taskId },
        data: { columnId: toColumnId, order: finalOrder },
      });
    } else {
      // Just update the task
      return tx.task.update({
        where: { id: taskId },
        data: { columnId: toColumnId, order: newOrder },
      });
    }
  });
}

/**
 * Calculate new order based on neighbors using sparse Int algorithm
 */
function calculateNewOrder(siblings: { order: number }[], toIndex: number): number {
  if (siblings.length === 0) {
    // First item
    return 1000;
  }

  if (toIndex === 0) {
    // Insert at start
    const next = siblings[0];
    const newOrder = Math.floor(next.order / 2);
    // Must be at least 1
    return newOrder > 0 ? newOrder : 1;
  }

  if (toIndex >= siblings.length) {
    // Insert at end
    const prev = siblings[siblings.length - 1];
    return prev.order + 1000;
  }

  // Insert between
  const prev = siblings[toIndex - 1];
  const next = siblings[toIndex];
  return Math.floor((prev.order + next.order) / 2);
}

/**
 * Check if renormalization is needed
 * Trigger when min gap < 2
 */
function checkRenormNeeded(tasks: { order: number }[]): boolean {
  if (tasks.length < 2) return false;

  for (let i = 1; i < tasks.length; i++) {
    const gap = tasks[i].order - tasks[i - 1].order;
    if (gap < 2) {
      return true;
    }
  }
  return false;
}

/**
 * Renormalize all tasks in a column to 1000, 2000, 3000, ...
 * Excludes the task being moved (will be inserted after)
 */
async function renormalizeTasks(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  columnId: string,
  excludeTaskId: string
): Promise<void> {
  const tasks = await tx.task.findMany({
    where: { columnId, id: { not: excludeTaskId } },
    orderBy: { order: 'asc' },
  });

  for (let i = 0; i < tasks.length; i++) {
    await tx.task.update({
      where: { id: tasks[i].id },
      data: { order: (i + 1) * 1000 },
    });
  }
}

