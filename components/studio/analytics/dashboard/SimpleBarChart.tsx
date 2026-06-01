type SimpleBarChartProps = {
  emptyMessage?: string;
  maxValue?: number;
  points: Array<{ label: string; value: number }>;
};

export function SimpleBarChart({
  emptyMessage = "Chưa có dữ liệu.",
  maxValue,
  points
}: SimpleBarChartProps) {
  const peak = maxValue ?? Math.max(...points.map((p) => p.value), 1);
  const hasData = points.some((p) => p.value > 0);

  if (!hasData) {
    return (
      <p className="rounded-lg border border-dashed border-white/15 px-4 py-8 text-center text-sm text-zinc-500">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto pb-1">
      <div
        className="flex min-w-[280px] items-end gap-1.5 sm:min-w-0"
        style={{ minHeight: "10rem" }}
      >
        {points.map((point) => {
          const height = peak > 0 ? Math.max(4, (point.value / peak) * 100) : 4;

          return (
            <div
              className="flex min-w-[2rem] flex-1 flex-col items-center gap-1"
              key={point.label}
              title={`${point.label}: ${point.value.toLocaleString("vi-VN")}`}
            >
              <div className="flex w-full flex-1 items-end justify-center">
                <div
                  className="w-full max-w-[2.5rem] rounded-t-md bg-gradient-to-t from-cyan-600/80 to-cyan-300/90"
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-zinc-500">{point.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
