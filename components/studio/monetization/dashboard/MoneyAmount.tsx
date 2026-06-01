import { formatMonetizationVnd } from "@/lib/studio/format-monetization-display";

type MoneyAmountProps = {
  value: number | null | undefined;
  className?: string;
  emptyLabel?: string;
  hidden?: boolean;
  emphasis?: "default" | "large";
};

export function MoneyAmount({
  value,
  className = "",
  emptyLabel = "—",
  hidden = false,
  emphasis = "default"
}: MoneyAmountProps) {
  if (hidden) {
    return <span className={`text-zinc-500 ${className}`}>—</span>;
  }

  const amount = value ?? 0;
  const formatted =
    amount === 0 && emptyLabel !== "—" ? emptyLabel : formatMonetizationVnd(amount);

  const sizeClass =
    emphasis === "large" ? "text-2xl font-bold text-white sm:text-3xl" : "text-lg font-bold text-white";

  return (
    <span className={`tabular-nums ${sizeClass} ${amount === 0 ? "text-zinc-500" : ""} ${className}`}>
      {formatted}
    </span>
  );
}
