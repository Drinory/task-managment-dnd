/**
 * Loading UI for /projects route
 * Demonstrates Next.js Suspense/Streaming capabilities
 */
export default function ProjectsLoading() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header skeleton */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="h-10 w-48 animate-pulse rounded bg-gray-200" />
            <div className="mt-2 h-4 w-64 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-200" />
        </div>

        {/* Project list skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="h-6 w-3/4 animate-pulse rounded bg-gray-200" />
              <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

