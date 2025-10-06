import { z } from 'zod';
import { router, publicProcedure, createTRPCError } from '../trpc';
import { moveTask } from '../services/tasks';

export const tasksRouter = router({
  listByColumn: publicProcedure
    .input(z.object({ columnId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.task.findMany({
        where: { columnId: input.columnId },
        orderBy: { order: 'asc' },
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        columnId: z.string(),
        title: z.string().min(1).max(500),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const column = await ctx.prisma.column.findUnique({
        where: { id: input.columnId },
      });
      if (!column) {
        throw createTRPCError('NOT_FOUND', 'Column not found');
      }

      // Find max order in column to append at end
      const lastTask = await ctx.prisma.task.findFirst({
        where: { columnId: input.columnId },
        orderBy: { order: 'desc' },
      });

      const order = lastTask ? lastTask.order + 1000 : 1000;

      return ctx.prisma.task.create({
        data: {
          columnId: input.columnId,
          title: input.title,
          description: input.description,
          order,
        },
      });
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(500).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.id },
      });
      if (!task) {
        throw createTRPCError('NOT_FOUND', 'Task not found');
      }

      return ctx.prisma.task.update({
        where: { id: input.id },
        data: {
          ...(input.title !== undefined && { title: input.title }),
          ...(input.description !== undefined && {
            description: input.description,
          }),
        },
      });
    }),

  move: publicProcedure
    .input(
      z.object({
        taskId: z.string(),
        toColumnId: z.string(),
        toIndex: z.number().int().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return moveTask(ctx.prisma, input.taskId, input.toColumnId, input.toIndex);
    }),

  remove: publicProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.taskId },
      });
      if (!task) {
        throw createTRPCError('NOT_FOUND', 'Task not found');
      }

      await ctx.prisma.task.delete({
        where: { id: input.taskId },
      });

      return { ok: true };
    }),
});

