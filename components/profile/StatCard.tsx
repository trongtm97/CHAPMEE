import { Card } from "@/components/ui";
import { formatReelsCount } from "@/lib/reels/formatCount";

type StatCardProps = {
  label: string;
  value: number | string;
  hint?: string;
};

export function StatCard({ hint, label, value }: StatCardProps) {
  const displayValue =
    typeof value === "number" ? formatReelsCount(value) : value;

  return (
    <Card className="space-y-1.5 p-3">
      <p className="text-[0.64rem] font-bold uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>
      <p className="text-lg font-black tracking-normal text-white">
        {displayValue}
      </p>
      {hint ? <p className="text-xs leading-5 text-zinc-400">{hint}</p> : null}
    </Card>
  );
}
