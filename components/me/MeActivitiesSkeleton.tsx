export function MeActivitiesSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2" role="status">
      {Array.from({ length: count }).map((_, index) => (
        <div
          className="flex animate-pulse gap-3 rounded-[1rem] border border-white/8 bg-white/[0.02] p-3"
          key={index}
        >
          <div className="h-9 w-9 shrink-0 rounded-full bg-white/10" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-full rounded bg-white/10" />
            <div className="h-3 w-2/3 rounded bg-white/10" />
          </div>
        </div>
      ))}
      <span className="sr-only">Đang tải hoạt động...</span>
    </div>
  );
}
