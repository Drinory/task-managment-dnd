/**
 * Query key factory for tRPC queries
 * Centralizes cache key management
 */
export const queryKeys = {
  projects: {
    all: ['projects'] as const,
    detail: (id: string) => ['projects', id] as const,
  },
  columns: {
    byProject: (projectId: string) => ['columns', 'project', projectId] as const,
  },
  tasks: {
    byColumn: (columnId: string) => ['tasks', 'column', columnId] as const,
  },
};

