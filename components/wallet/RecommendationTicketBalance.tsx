import { formatRecommendationPoints } from "@/lib/format/money";

type RecommendationTicketBalanceProps = {
  balance: number;
  className?: string;
  label?: string;
};

export function RecommendationTicketBalance({
  balance,
  className = "",
  label = "Phiếu đề cử của bạn"
}: RecommendationTicketBalanceProps) {
  return (
    <p className={`text-sm text-zinc-300 ${className}`.trim()}>
      <span className="text-zinc-500">{label}: </span>
      <span className="font-bold text-amber-300 tabular-nums">
        {formatRecommendationPoints(balance)}
      </span>
    </p>
  );
}
