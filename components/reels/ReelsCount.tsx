import { formatReelsCount } from "@/lib/reels/formatCount";

type ReelsCountProps = {
  value: number;
};

export function ReelsCount({ value }: ReelsCountProps) {
  return (
    <span className="min-w-[1.5rem] text-center text-[0.67rem] font-semibold leading-none tabular-nums text-zinc-200/90">
      {formatReelsCount(value)}
    </span>
  );
}
