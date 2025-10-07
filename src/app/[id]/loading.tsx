import { BoardSkeleton } from '@/components/ui/Skeleton';

/**
 * Loading UI for /projects/[id] route
 * Demonstrates Next.js Suspense/Streaming for dynamic routes
 */
export default function ProjectLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-8 py-4">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
        <div className="mt-2 h-4 w-96 animate-pulse rounded bg-gray-200" />
      </header>
      <main className="overflow-x-auto">
        <BoardSkeleton />
      </main>
    </div>
  );
}

