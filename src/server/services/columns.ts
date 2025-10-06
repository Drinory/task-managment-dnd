import { PrismaClient, Column } from '@prisma/client';
import { createTRPCError } from '../trpc';

// Track moves per project for renormalization trigger
const projectMoveCount = new Map<string, number>();

/**
 * Move column to a new position within the project
 * Uses sparse Int ordering with renormalization when needed
 */
export async function moveColumn(
  prisma: PrismaClient,
  projectId: string,
  columnId: string,
  toIndex: number
): Promise<Column> {
  // Validate project exists
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  if (!project) {
    throw createTRPCError('NOT_FOUND', 'Project not found');
  }

  // Validate column exists and belongs to project
  const column = await prisma.column.findUnique({
    where: { id: columnId },
  });
  if (!column) {
    throw createTRPCError('NOT_FOUND', 'Column not found');
  }
  if (column.projectId !== projectId) {
    throw createTRPCError('BAD_REQUEST', 'Column does not belong to this project');
  }

  // Get all columns in project sorted by order
  const columns = await prisma.column.findMany({
    where: { projectId },
    orderBy: { order: 'asc' },
  });

  // Check if moving to same index (idempotency)
  const currentIndex = columns.findIndex((c) => c.id === columnId);
  if (currentIndex === toIndex) {
    return column;
  }

  // Filter out the current column
  const columnsWithoutCurrent = columns.filter((c) => c.id !== columnId);

  // Validate toIndex
  if (toIndex < 0 || toIndex > columnsWithoutCurrent.length) {
    throw createTRPCError('BAD_REQUEST', 'Invalid toIndex');
  }

  // Calculate new order
  const newOrder = calculateNewOrder(columnsWithoutCurrent, toIndex);

  // Check if renormalization is needed (min gap < 2 OR 50 moves)
  const moveCount = (projectMoveCount.get(projectId) || 0) + 1;
  projectMoveCount.set(projectId, moveCount);
  const shouldRenorm =
    checkRenormNeeded(columnsWithoutCurrent) || moveCount >= 50;

  if (shouldRenorm) {
    projectMoveCount.set(projectId, 0); // Reset counter after renorm
  }

  return prisma.$transaction(async (tx) => {
    if (shouldRenorm) {
      // Renormalize all columns in the project
      await renormalizeColumns(tx, projectId, columnId);
      // Recalculate order after renorm
      const renormedColumns = await tx.column.findMany({
        where: { projectId, id: { not: columnId } },
        orderBy: { order: 'asc' },
      });
      const finalOrder = calculateNewOrder(renormedColumns, toIndex);
      return tx.column.update({
        where: { id: columnId },
        data: { order: finalOrder },
      });
    } else {
      // Just update the column
      return tx.column.update({
        where: { id: columnId },
        data: { order: newOrder },
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
function checkRenormNeeded(columns: { order: number }[]): boolean {
  if (columns.length < 2) return false;

  for (let i = 1; i < columns.length; i++) {
    const gap = columns[i].order - columns[i - 1].order;
    if (gap < 2) {
      return true;
    }
  }
  return false;
}

/**
 * Renormalize all columns in a project to 1000, 2000, 3000, ...
 * Excludes the column being moved (will be inserted after)
 */
async function renormalizeColumns(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  projectId: string,
  excludeColumnId: string
): Promise<void> {
  const columns = await tx.column.findMany({
    where: { projectId, id: { not: excludeColumnId } },
    orderBy: { order: 'asc' },
  });

  for (let i = 0; i < columns.length; i++) {
    await tx.column.update({
      where: { id: columns[i].id },
      data: { order: (i + 1) * 1000 },
    });
  }
}

