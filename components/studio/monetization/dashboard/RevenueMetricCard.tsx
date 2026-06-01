import { MonetizationKpiCard, type MonetizationTone } from "@/components/studio/monetization/monetization-ui";

type RevenueMetricCardProps = {
  tone: MonetizationTone;
  label: string;
  value: string;
  hint?: string;
  muted?: boolean;
  tag?: string;
};

export function RevenueMetricCard({
  tone,
  label,
  value,
  hint,
  muted,
  tag
}: RevenueMetricCardProps) {
  return (
    <div className="relative">
      {tag ? (
        <span className="absolute right-3 top-3 z-10 rounded-full border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-100">
          {tag}
        </span>
      ) : null}
      <MonetizationKpiCard hint={hint} label={label} muted={muted} tone={tone} value={value} />
    </div>
  );
}
