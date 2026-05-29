type SwipeProgressProps = {
  current: number;
  total: number;
};

export function SwipeProgress({ current, total }: SwipeProgressProps) {
  const safeTotal = Math.max(total, 1);
  const percent = Math.min(100, Math.max(0, (current / safeTotal) * 100));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="chap-pill px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-cyan-200">
          {current}/{total}
        </span>
        <span className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-zinc-500">
          Swipe
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full bg-cyan-300/80 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
