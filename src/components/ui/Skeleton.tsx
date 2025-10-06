export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-200 ${className}`}
      aria-label="Loading..."
    />
  );
}

export function BoardSkeleton() {
  return (
    <div className="inline-flex gap-4 p-8">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex h-[500px] w-[300px] flex-col rounded-xl border bg-white p-3 shadow-sm"
        >
          <Skeleton className="mb-4 h-6 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

