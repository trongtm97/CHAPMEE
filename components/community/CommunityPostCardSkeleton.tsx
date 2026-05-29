export function CommunityPostCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="chap-card animate-pulse space-y-2 p-3"
    >
      <div className="flex gap-3">
        <div className="size-10 rounded-full bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-28 rounded bg-white/10" />
          <div className="h-2.5 w-20 rounded bg-white/10" />
        </div>
      </div>
      <div className="h-3 w-24 rounded bg-white/10" />
      <div className="h-4 w-3/4 rounded bg-white/10" />
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-white/10" />
        <div className="h-3 w-5/6 rounded bg-white/10" />
      </div>
      <div className="flex gap-3">
        <div className="h-8 w-16 rounded-full bg-white/10" />
        <div className="h-8 w-16 rounded-full bg-white/10" />
        <div className="h-8 w-16 rounded-full bg-white/10" />
      </div>
    </div>
  );
}
