export default function ResumeSkeleton() {
  return (
    <div className="space-y-6" role="status">
      <span className="sr-only">Loading your resume…</span>
      <div className="space-y-6" aria-hidden="true">
        <div className="space-y-2">
          <div className="h-8 w-44 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-80 max-w-full animate-pulse rounded-md bg-muted" />
        </div>
        <div className="flex w-full max-w-sm gap-1 border-b border-border">
          <div className="h-9 w-32 animate-pulse rounded-t-lg bg-muted" />
          <div className="h-9 w-32 animate-pulse rounded-t-lg bg-muted" />
        </div>
        <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="space-y-2">
            <div className="h-5 w-48 animate-pulse rounded-md bg-muted" />
            <div className="h-3 w-72 max-w-full animate-pulse rounded-md bg-muted" />
          </div>
          <div className="space-y-4">
            <div className="h-9 animate-pulse rounded-lg bg-muted" />
            <div className="h-32 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
        <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="h-5 w-40 animate-pulse rounded-md bg-muted" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="h-9 animate-pulse rounded-lg bg-muted" />
            <div className="h-9 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
        <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="h-5 w-36 animate-pulse rounded-md bg-muted" />
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
            <div className="h-9 w-36 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
      </div>
    </div>
  )
}
