import Link from 'next/link';

/**
 * Custom 404 page for project routes
 * Demonstrates Next.js notFound() handling
 */
export default function ProjectNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900">404</h1>
        <h2 className="mt-4 text-2xl font-bold text-gray-900">Project not found</h2>
        <p className="mt-2 text-gray-600">
          The project you're looking for doesn't exist or was deleted.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          ← Back to Projects
        </Link>
      </div>
    </div>
  );
}

