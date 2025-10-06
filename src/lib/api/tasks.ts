'use client';

import { trpc } from '@/lib/trpc/client';
import { queryKeys } from '@/lib/queryKeys';
import { useQueryClient } from '@tanstack/react-query';
import { arrayMove } from '@dnd-kit/sortable';
import type { Task } from '@prisma/client';

/**
 * Hook for optimistic task move (within or across columns)
 */
export function useMoveTask(projectId: string) {
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();

  const mutation = trpc.tasks.move.useMutation({
    onMutate: async ({ taskId, toColumnId, toIndex }) => {
      // Find which column the task is currently in
      const allColumnsData = queryClient.getQueryData<
        Array<{ id: string }>
      >(queryKeys.columns.byProject(projectId));

      if (!allColumnsData) return {};

      const columnIds = allColumnsData.map((c) => c.id);

      // Find the source column
      let fromColumnId: string | null = null;
      for (const colId of columnIds) {
        const tasks = queryClient.getQueryData<Task[]>(
          queryKeys.tasks.byColumn(colId)
        );
        if (tasks?.some((t) => t.id === taskId)) {
          fromColumnId = colId;
          break;
        }
      }

      if (!fromColumnId) return {};

      // Cancel queries
      await queryClient.cancelQueries({
        queryKey: queryKeys.tasks.byColumn(fromColumnId),
      });
      await queryClient.cancelQueries({
        queryKey: queryKeys.tasks.byColumn(toColumnId),
      });

      // Snapshot
      const previousFromTasks = queryClient.getQueryData<Task[]>(
        queryKeys.tasks.byColumn(fromColumnId)
      );
      const previousToTasks =
        fromColumnId === toColumnId
          ? previousFromTasks
          : queryClient.getQueryData<Task[]>(
              queryKeys.tasks.byColumn(toColumnId)
            );

      // Optimistic update
      if (previousFromTasks) {
        const taskIndex = previousFromTasks.findIndex((t) => t.id === taskId);
        if (taskIndex === -1) return {};

        const task = previousFromTasks[taskIndex];

        if (fromColumnId === toColumnId) {
          // Same column
          const optimisticTasks = arrayMove(previousFromTasks, taskIndex, toIndex);
          queryClient.setQueryData(
            queryKeys.tasks.byColumn(fromColumnId),
            optimisticTasks
          );
        } else {
          // Cross-column
          const optimisticFromTasks = previousFromTasks.filter(
            (t) => t.id !== taskId
          );
          const optimisticToTasks = [...(previousToTasks || [])];
          optimisticToTasks.splice(toIndex, 0, { ...task, columnId: toColumnId });

          queryClient.setQueryData(
            queryKeys.tasks.byColumn(fromColumnId),
            optimisticFromTasks
          );
          queryClient.setQueryData(
            queryKeys.tasks.byColumn(toColumnId),
            optimisticToTasks
          );
        }
      }

      return { previousFromTasks, previousToTasks, fromColumnId };
    },
    onError: (err, { toColumnId }, context) => {
      // Rollback
      if (context?.previousFromTasks && context.fromColumnId) {
        queryClient.setQueryData(
          queryKeys.tasks.byColumn(context.fromColumnId),
          context.previousFromTasks
        );
      }
      if (
        context?.previousToTasks &&
        context.fromColumnId &&
        context.fromColumnId !== toColumnId
      ) {
        queryClient.setQueryData(
          queryKeys.tasks.byColumn(toColumnId),
          context.previousToTasks
        );
      }
      console.error('Failed to move task:', err.message);
    },
    onSettled: (data, error, { toColumnId }, context) => {
      // Invalidate both columns
      if (context?.fromColumnId) {
        utils.tasks.listByColumn.invalidate({ columnId: context.fromColumnId });
      }
      utils.tasks.listByColumn.invalidate({ columnId: toColumnId });
    },
  });

  return mutation;
}

/**
 * Hook for removing a task (trash)
 */
export function useRemoveTask() {
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();

  const mutation = trpc.tasks.remove.useMutation({
    onMutate: async ({ taskId }) => {
      // Find which column the task is in
      const allQueries = queryClient.getQueriesData<Task[]>({
        queryKey: ['tasks'],
      });

      let columnId: string | null = null;
      let previousTasks: Task[] | undefined;

      for (const [queryKey, tasks] of allQueries) {
        if (tasks?.some((t) => t.id === taskId)) {
          columnId = queryKey[2] as string;
          previousTasks = tasks;
          break;
        }
      }

      if (!columnId || !previousTasks) return {};

      // Cancel
      await queryClient.cancelQueries({
        queryKey: queryKeys.tasks.byColumn(columnId),
      });

      // Optimistic remove
      const optimisticTasks = previousTasks.filter((t) => t.id !== taskId);
      queryClient.setQueryData(
        queryKeys.tasks.byColumn(columnId),
        optimisticTasks
      );

      return { previousTasks, columnId };
    },
    onError: (err, variables, context) => {
      // Rollback
      if (context?.previousTasks && context.columnId) {
        queryClient.setQueryData(
          queryKeys.tasks.byColumn(context.columnId),
          context.previousTasks
        );
      }
      console.error('Failed to remove task:', err.message);
    },
    onSettled: (data, error, variables, context) => {
      // Invalidate
      if (context?.columnId) {
        utils.tasks.listByColumn.invalidate({ columnId: context.columnId });
      }
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

