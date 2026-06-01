export function StudioStoryListSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3 sm:p-4"
          key={index}
        >
          <div className="h-[4.5rem] w-12 shrink-0 animate-pulse rounded-xl bg-white/10 sm:h-24 sm:w-[4.5rem]" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-full animate-pulse rounded bg-white/5" />
            <div className="flex gap-2">
              <div className="h-5 w-16 animate-pulse rounded-full bg-white/10" />
              <div className="h-5 w-20 animate-pulse rounded-full bg-white/10" />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((__, metricIndex) => (
                <div
                  className="h-8 animate-pulse rounded bg-white/5"
                  key={metricIndex}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StudioStoriesPageSkeleton() {
  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded bg-white/10" />
        <div className="h-4 w-72 animate-pulse rounded bg-white/5" />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            className="h-20 animate-pulse rounded-xl border border-white/10 bg-white/[0.02]"
            key={index}
          />
        ))}
      </div>

      <div className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/[0.02]" />
      <div className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/[0.02]" />

      <StudioStoryListSkeleton />
    </div>
  );
}
