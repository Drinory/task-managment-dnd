import { router } from '../trpc';
import { projectsRouter } from './projects';
import { columnsRouter } from './columns';
import { tasksRouter } from './tasks';

export const appRouter = router({
  projects: projectsRouter,
  columns: columnsRouter,
  tasks: tasksRouter,
});

export type AppRouter = typeof appRouter;

