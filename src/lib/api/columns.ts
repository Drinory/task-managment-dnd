'use client';

import { trpc } from '@/lib/trpc/client';
import { queryKeys } from '@/lib/queryKeys';
import { useQueryClient } from '@tanstack/react-query';
import { arrayMove } from '@dnd-kit/sortable';
import type { Column } from '@prisma/client';

/**
 * Hook for optimistic column move
 * Follows pattern: optimistic update → mutate → settle/rollback
 */
export function useMoveColumn(projectId: string) {
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();

  const mutation = trpc.columns.move.useMutation({
    onMutate: async ({ columnId, toIndex }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.columns.byProject(projectId),
      });

      // Snapshot current state
      const previousColumns = queryClient.getQueryData<Column[]>(
        queryKeys.columns.byProject(projectId)
      );

      // Optimistically update
      if (previousColumns) {
        const fromIndex = previousColumns.findIndex((c) => c.id === columnId);
        if (fromIndex !== -1) {
          const optimisticColumns = arrayMove(previousColumns, fromIndex, toIndex);
          queryClient.setQueryData(
            queryKeys.columns.byProject(projectId),
            optimisticColumns
          );
        }
      }

      return { previousColumns };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousColumns) {
        queryClient.setQueryData(
          queryKeys.columns.byProject(projectId),
          context.previousColumns
        );
      }
      console.error('Failed to move column:', err.message);
    },
    onSettled: () => {
      // Invalidate to sync with server
      utils.columns.listByProject.invalidate({ projectId });
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

