import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/server/db';
import {Board} from "@/components/board/Board";

/**
 * Server Component - Fetches project data server-side
 * Demonstrates Next.js 14 dynamic routes with SSR
 * Passes projectId to Client Component (Board) for DnD + Zustand drag state
 */
export default async function ProjectPage({
  params,
}: {
  params: { id: string };
}) {
  const projectId = params.id;

  // Server-side data fetching with Prisma
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  // Next.js notFound() function for 404 handling
  if (!project) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ← Projects
              </Link>
              <span className="text-gray-300">/</span>
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Drag columns and tasks to reorder • Use keyboard for accessibility
            </p>
          </div>
        </div>
      </header>
      <main className="overflow-x-auto">
        {/* Client Component for DnD + Zustand (drag state only) */}
        <Board projectId={projectId} />
      </main>
    </div>
  );
}

