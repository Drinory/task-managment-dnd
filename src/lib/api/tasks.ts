'use client';

import { trpc } from '@/lib/trpc/client';
import { arrayMove } from '@dnd-kit/sortable';

/**
 * Hook for optimistic task move (within or across columns)
 */
export function useMoveTask(projectId: string) {
  const utils = trpc.useUtils();

  const mutation = trpc.tasks.move.useMutation({
    onMutate: async ({ taskId, toColumnId, toIndex }) => {
      // Find the source column by checking all column queries
      let fromColumnId: string | null = null;
      const allColumnsData = utils.columns.listByProject.getData({ projectId });
      
      if (!allColumnsData) return {};

      for (const column of allColumnsData) {
        const tasks = utils.tasks.listByColumn.getData({ columnId: column.id });
        if (tasks?.some((t) => t.id === taskId)) {
          fromColumnId = column.id;
          break;
        }
      }

      if (!fromColumnId) return {};

      // Cancel queries to prevent race conditions
      await utils.tasks.listByColumn.cancel({ columnId: fromColumnId });
      await utils.tasks.listByColumn.cancel({ columnId: toColumnId });

      // Snapshot previous data for rollback
      const previousFromTasks = utils.tasks.listByColumn.getData({ 
        columnId: fromColumnId 
      });
      const previousToTasks = fromColumnId === toColumnId
        ? previousFromTasks
        : utils.tasks.listByColumn.getData({ columnId: toColumnId });

      // Optimistic update - immediately update UI
      if (previousFromTasks) {
        const taskIndex = previousFromTasks.findIndex((t) => t.id === taskId);
        if (taskIndex === -1) return {};

        const task = previousFromTasks[taskIndex];

        if (fromColumnId === toColumnId) {
          // Same column - reorder
          const optimisticTasks = arrayMove(previousFromTasks, taskIndex, toIndex);
          utils.tasks.listByColumn.setData(
            { columnId: fromColumnId },
            optimisticTasks
          );
        } else {
          // Cross-column - remove from source, add to destination
          const optimisticFromTasks = previousFromTasks.filter(
            (t) => t.id !== taskId
          );
          const optimisticToTasks = [...(previousToTasks || [])];
          optimisticToTasks.splice(toIndex, 0, { ...task, columnId: toColumnId });

          utils.tasks.listByColumn.setData(
            { columnId: fromColumnId },
            optimisticFromTasks
          );
          utils.tasks.listByColumn.setData(
            { columnId: toColumnId },
            optimisticToTasks
          );
        }
      }

      return { previousFromTasks, previousToTasks, fromColumnId };
    },
    onSuccess: (updatedTask, { toColumnId }, context) => {
      // Update the cache with the server response (has correct order values)
      // This keeps the UI in sync without refetching
      if (context?.fromColumnId && context.fromColumnId !== toColumnId) {
        // Cross-column move: update the destination column with server data
        const currentToTasks = utils.tasks.listByColumn.getData({ columnId: toColumnId });
        if (currentToTasks) {
          const updatedToTasks = currentToTasks.map((t) =>
            t.id === updatedTask.id ? updatedTask : t
          );
          utils.tasks.listByColumn.setData({ columnId: toColumnId }, updatedToTasks);
        }
      } else if (context?.fromColumnId) {
        // Same column move: update with server data
        const currentTasks = utils.tasks.listByColumn.getData({ columnId: context.fromColumnId });
        if (currentTasks) {
          const updatedTasks = currentTasks.map((t) =>
            t.id === updatedTask.id ? updatedTask : t
          );
          utils.tasks.listByColumn.setData({ columnId: context.fromColumnId }, updatedTasks);
        }
      }
    },
    onError: (err, { toColumnId }, context) => {
      // Rollback on error by restoring snapshots
      if (context?.previousFromTasks && context.fromColumnId) {
        utils.tasks.listByColumn.setData(
          { columnId: context.fromColumnId },
          context.previousFromTasks
        );
      }
      if (
        context?.previousToTasks &&
        context.fromColumnId &&
        context.fromColumnId !== toColumnId
      ) {
        utils.tasks.listByColumn.setData(
          { columnId: toColumnId },
          context.previousToTasks
        );
      }
      console.error('Failed to move task:', err.message);
    },
  });

  return mutation;
}

/**
 * Hook for removing a task (trash)
 */
export function useRemoveTask() {
  const utils = trpc.useUtils();

  const mutation = trpc.tasks.remove.useMutation({
    onSuccess: () => {
      // After successful deletion, invalidate all task queries to refetch
      utils.tasks.listByColumn.invalidate();
    },
    onError: (err) => {
      console.error('Failed to remove task:', err.message);
    },
  });

  return mutation;
}

/**
 * Hook for creating a new task
 */
export function useCreateTask() {
  const utils = trpc.useUtils();

  const mutation = trpc.tasks.create.useMutation({
    onSuccess: (newTask) => {
      utils.tasks.listByColumn.invalidate({ columnId: newTask.columnId });
    },
  });

  return mutation;
}

