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
    <div className="min-w-0 px-1 py-2 text-center sm:px-2">
      <p className="text-base font-black tabular-nums tracking-normal text-white sm:text-lg">
        {displayValue}
      </p>
      <p className="mt-0.5 text-[0.68rem] font-medium leading-snug text-zinc-500">
        {label}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[0.6rem] leading-tight text-zinc-600">{hint}</p>
      ) : null}
    </div>
  );
}
