export function NotificationSkeleton() {
  return (
    <div className="divide-y divide-white/6 rounded-xl border border-white/8 bg-white/[0.02]">
      {Array.from({ length: 5 }).map((_, index) => (
        <div className="flex gap-3 px-3 py-3" key={index}>
          <div className="size-10 shrink-0 animate-pulse rounded-full bg-white/8" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3.5 w-2/5 animate-pulse rounded bg-white/8" />
            <div className="h-3 w-full animate-pulse rounded bg-white/6" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-white/6" />
            <div className="h-2.5 w-16 animate-pulse rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
