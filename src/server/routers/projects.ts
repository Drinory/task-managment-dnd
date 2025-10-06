import { z } from 'zod';
import { router, publicProcedure, createTRPCError } from '../trpc';

export const projectsRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.id },
      });
      if (!project) {
        throw createTRPCError('NOT_FOUND', 'Project not found');
      }
      return project;
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.project.create({
        data: {
          name: input.name,
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
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.id },
      });
      if (!project) {
        throw createTRPCError('NOT_FOUND', 'Project not found');
      }
      return ctx.prisma.project.update({
        where: { id: input.id },
        data: { name: input.name },
      });
    }),

  remove: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.id },
        include: { columns: true },
      });
      if (!project) {
        throw createTRPCError('NOT_FOUND', 'Project not found');
      }
      if (project.columns.length > 0) {
        throw createTRPCError(
          'BAD_REQUEST',
          'Cannot delete project with columns'
        );
      }
      await ctx.prisma.project.delete({
        where: { id: input.id },
      });
      return { ok: true };
    }),
});

