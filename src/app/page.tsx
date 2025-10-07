import { prisma } from '@/server/db';
import { ProjectList } from '@/components/projects/ProjectList';

/**
 * Server Component - Fetches projects server-side with Prisma
 * Demonstrates Next.js 14 App Router SSR capabilities
 * Passes data to Client Component for interactive CRUD operations
 */
export default async function ProjectsPage() {
  // Server-side data fetching with Prisma (not tRPC)
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <ProjectList initialProjects={projects} />
      </div>
    </div>
  );
}

