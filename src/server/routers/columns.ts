import { z } from 'zod';
import { router, publicProcedure, createTRPCError } from '../trpc';
import { moveColumn } from '../services/columns';

export const columnsRouter = router({
  listByProject: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.column.findMany({
        where: { projectId: input.projectId },
        orderBy: { order: 'asc' },
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(1).max(200),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId },
      });
      if (!project) {
        throw createTRPCError('NOT_FOUND', 'Project not found');
      }

      // Find max order in project to append at end
      const lastColumn = await ctx.prisma.column.findFirst({
        where: { projectId: input.projectId },
        orderBy: { order: 'desc' },
      });

      const order = lastColumn ? lastColumn.order + 1000 : 1000;

      return ctx.prisma.column.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          order,
        },
      });
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(200),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const column = await ctx.prisma.column.findUnique({
        where: { id: input.id },
      });
      if (!column) {
        throw createTRPCError('NOT_FOUND', 'Column not found');
      }

      return ctx.prisma.column.update({
        where: { id: input.id },
        data: { name: input.name },
      });
    }),

  move: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        columnId: z.string(),
        toIndex: z.number().int().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return moveColumn(
        ctx.prisma,
        input.projectId,
        input.columnId,
        input.toIndex
      );
    }),

  remove: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const column = await ctx.prisma.column.findUnique({
        where: { id: input.id },
        include: { tasks: true },
      });
      if (!column) {
        throw createTRPCError('NOT_FOUND', 'Column not found');
      }
      if (column.tasks.length > 0) {
        throw createTRPCError('BAD_REQUEST', 'Cannot delete column with tasks');
      }

      await ctx.prisma.column.delete({
        where: { id: input.id },
      });

      return { ok: true };
    }),
});

