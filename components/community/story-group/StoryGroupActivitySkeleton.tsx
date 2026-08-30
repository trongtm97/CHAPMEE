export function StoryGroupActivitySkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          className="animate-pulse space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          key={index}
        >
          <div className="h-3 w-24 rounded bg-white/10" />
          <div className="h-4 w-40 rounded bg-white/10" />
          <div className="h-12 rounded bg-white/10" />
        </div>
      ))}
    </div>
  );
}
