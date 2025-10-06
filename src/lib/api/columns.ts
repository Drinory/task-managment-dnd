'use client';

import { trpc } from '@/lib/trpc/client';
import { arrayMove } from '@dnd-kit/sortable';

/**
 * Hook for optimistic column move
 * Follows pattern: optimistic update → mutate → settle/rollback
 */
export function useMoveColumn(projectId: string) {
  const utils = trpc.useUtils();

  const mutation = trpc.columns.move.useMutation({
    onMutate: async ({ columnId, toIndex }) => {
      // Cancel outgoing refetches to prevent race conditions
      await utils.columns.listByProject.cancel({ projectId });

      // Snapshot current state for rollback
      const previousColumns = utils.columns.listByProject.getData({ projectId });

      // Optimistically update - immediately update UI
      if (previousColumns) {
        const fromIndex = previousColumns.findIndex((c) => c.id === columnId);
        if (fromIndex !== -1) {
          const optimisticColumns = arrayMove(previousColumns, fromIndex, toIndex);
          utils.columns.listByProject.setData(
            { projectId },
            optimisticColumns
          );
        }
      }

      return { previousColumns };
    },
    onSuccess: (updatedColumn) => {
      // Update cache with server response (has correct order values)
      // This keeps UI in sync without refetching
      const currentColumns = utils.columns.listByProject.getData({ projectId });
      if (currentColumns) {
        const updatedColumns = currentColumns.map((c) =>
          c.id === updatedColumn.id ? updatedColumn : c
        );
        utils.columns.listByProject.setData({ projectId }, updatedColumns);
      }
    },
    onError: (err, variables, context) => {
      // Rollback on error by restoring snapshot
      if (context?.previousColumns) {
        utils.columns.listByProject.setData(
          { projectId },
          context.previousColumns
        );
      }
      console.error('Failed to move column:', err.message);
    },
  });

  return mutation;
}

/**
 * Hook for creating a new column
 */
export function useCreateColumn() {
  const utils = trpc.useUtils();

  const mutation = trpc.columns.create.useMutation({
    onSuccess: (newColumn) => {
      // Invalidate columns list for the project
      utils.columns.listByProject.invalidate({ projectId: newColumn.projectId });
    },
  });

  return mutation;
}

/**
 * Hook for removing a column
 */
export function useRemoveColumn() {
  const utils = trpc.useUtils();

  const mutation = trpc.columns.remove.useMutation({
    onSuccess: () => {
      // Invalidate all columns queries
      utils.columns.invalidate();
    },
  });

  return mutation;
}

