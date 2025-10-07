'use client';

import { trpc } from '@/lib/trpc/client';
import { arrayMove } from '@dnd-kit/sortable';

/**
 * Hook for optimistic column move
 */
export function useMoveColumn(projectId: string) {
  const utils = trpc.useUtils();

  const mutation = trpc.columns.move.useMutation({
    onMutate: async ({ columnId, toIndex }) => {
      await utils.columns.listByProject.cancel({ projectId });

      const previousColumns = utils.columns.listByProject.getData({ projectId });

      if (previousColumns) {
        const fromIndex = previousColumns.findIndex((c) => c.id === columnId);
        if (fromIndex !== -1) {
          const optimisticColumns = arrayMove(previousColumns, fromIndex, toIndex);
          utils.columns.listByProject.setData({ projectId }, optimisticColumns);
        }
      }

      return { previousColumns };
    },
    onError: (err, variables, context) => {
      if (context?.previousColumns) {
        utils.columns.listByProject.setData({ projectId }, context.previousColumns);
      }
      console.error('Failed to move column:', err.message);
    },
    onSettled: () => {
      // Refetch in background to sync with server (no flicker since optimistic update stays)
      utils.columns.listByProject.invalidate({ projectId });
    },
  });

  return mutation;
}

/**
 * Hook for creating a new column with optimistic update
 */
// export function useCreateColumn(projectId: string) {
//   const utils = trpc.useUtils();
//
//   const mutation = trpc.columns.create.useMutation({
//     onMutate: async (newColumnData) => {
//       await utils.columns.listByProject.cancel({ projectId });
//
//       const previousColumns = utils.columns.listByProject.getData({ projectId });
//
//       // Optimistically add new column
//       if (previousColumns) {
//         const optimisticColumn = {
//           id: `temp-${Date.now()}`, // Temporary ID
//           ...newColumnData,
//           order: previousColumns.length,
//           createdAt: new Date(),
//           updatedAt: new Date(),
//         };
//         utils.columns.listByProject.setData(
//             { projectId },
//             [...previousColumns, optimisticColumn]
//         );
//       }
//
//       return { previousColumns };
//     },
//     onError: (err, variables, context) => {
//       if (context?.previousColumns) {
//         utils.columns.listByProject.setData({ projectId }, context.previousColumns);
//       }
//       console.error('Failed to create column:', err.message);
//     },
//     onSettled: () => {
//       utils.columns.listByProject.invalidate({ projectId });
//     },
//   });
//
//   return mutation;
// }
export function useCreateColumn(projectId: string) {
  const utils = trpc.useUtils();

  const mutation = trpc.columns.create.useMutation({
    onSuccess: () => {
      // Just invalidate to refetch with real server data
      utils.columns.listByProject.invalidate({ projectId });
    },
    onError: (err) => {
      console.error('Failed to create column:', err.message);
    },
  });

  return mutation;
}

/**
 * Hook for updating a column name with optimistic update
 */
export function useUpdateColumn(projectId: string) {
  const utils = trpc.useUtils();

  const mutation = trpc.columns.update.useMutation({
    onMutate: async ({ id, name }) => {
      await utils.columns.listByProject.cancel({ projectId });

      const previousColumns = utils.columns.listByProject.getData({ projectId });

      // Optimistically update column name
      if (previousColumns) {
        const optimisticColumns = previousColumns.map((col) =>
          col.id === id ? { ...col, name } : col
        );
        utils.columns.listByProject.setData({ projectId }, optimisticColumns);
      }

      return { previousColumns };
    },
    onError: (err, variables, context) => {
      if (context?.previousColumns) {
        utils.columns.listByProject.setData({ projectId }, context.previousColumns);
      }
      console.error('Failed to update column:', err.message);
    },
    onSettled: () => {
      utils.columns.listByProject.invalidate({ projectId });
    },
  });

  return mutation;
}

/**
 * Hook for removing a column with optimistic update
 */
export function useRemoveColumn(projectId: string) {
  const utils = trpc.useUtils();

  const mutation = trpc.columns.remove.useMutation({
    onMutate: async ({ id }) => {
      await utils.columns.listByProject.cancel({ projectId });
      await utils.tasks.listByColumn.cancel({ columnId: id });

      const previousColumns = utils.columns.listByProject.getData({ projectId });
      const previousTasks = utils.tasks.listByColumn.getData({ columnId: id });

      // Optimistically remove column
      if (previousColumns) {
        const optimisticColumns = previousColumns.filter((c) => c.id !== id);
        utils.columns.listByProject.setData({ projectId }, optimisticColumns);
      }

      // Optimistically clear tasks for this column
      utils.tasks.listByColumn.setData({ columnId: id }, []);

      return { previousColumns, previousTasks, columnId: id };
    },
    onError: (err, variables, context) => {
      if (context?.previousColumns) {
        utils.columns.listByProject.setData({ projectId }, context.previousColumns);
      }
      if (context?.previousTasks && context.columnId) {
        utils.tasks.listByColumn.setData({ columnId: context.columnId }, context.previousTasks);
      }
      console.error('Failed to remove column:', err.message);
    },
    onSettled: () => {
      utils.columns.listByProject.invalidate({ projectId });
    },
  });

  return mutation;
}
