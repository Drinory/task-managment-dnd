'use client';

import { trpc } from '@/lib/trpc/client';
import { Board } from '@/components/board/Board';
import { BoardSkeleton } from '@/components/ui/Skeleton';

export default function HomePage() {
  const { data: projects = [], isLoading } = trpc.projects.list.useQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="border-b bg-white px-8 py-4">
          <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        </header>
        <main className="overflow-x-auto">
          <BoardSkeleton />
        </main>
      </div>
    );
  }

  // Use first project or show create message
  const project = projects[0];

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">No projects found</h1>
          <p className="mt-2 text-gray-600">Run <code className="rounded bg-gray-100 px-2 py-1">pnpm db:reset</code> to seed the database</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-8 py-4">
        <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
        <p className="text-sm text-gray-500">Drag columns and tasks to reorder</p>
      </header>
      <main className="overflow-x-auto">
        <Board projectId={project.id} />
      </main>
    </div>
  );
}

