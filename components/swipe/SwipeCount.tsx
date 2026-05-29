import { formatSwipeCount } from "@/lib/swipe/formatCount";

type SwipeCountProps = {
  value: number;
};

export function SwipeCount({ value }: SwipeCountProps) {
  return (
    <span className="min-w-[1.5rem] text-center text-[0.67rem] font-semibold leading-none tabular-nums text-zinc-200/90">
      {formatSwipeCount(value)}
    </span>
  );
}
