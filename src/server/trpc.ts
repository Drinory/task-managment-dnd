import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { prisma } from './db';

/**
 * Context for tRPC procedures
 */
export const createTRPCContext = async () => {
  return {
    prisma,
  };
};

/**
 * Initialize tRPC with superjson transformer
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Public procedure - available to all
 */
export const publicProcedure = t.procedure;

/**
 * Router creator
 */
export const router = t.router;

/**
 * Merge routers
 */
export const mergeRouters = t.mergeRouters;

/**
 * Error helper - maps standard error codes per NFR
 */
export function createTRPCError(
  code: 'BAD_REQUEST' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL_SERVER_ERROR',
  message: string
): TRPCError {
  return new TRPCError({ code, message });
}

