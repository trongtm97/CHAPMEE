type MetricTooltipProps = {
  label: string;
  description: string;
};

export function MetricTooltip({ label, description }: MetricTooltipProps) {
  return (
    <span className="inline-flex items-center gap-1">
      <span>{label}</span>
      <span
        aria-label={description}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/20 text-[10px] text-zinc-400"
        title={description}
      >
        i
      </span>
    </span>
  );
}
