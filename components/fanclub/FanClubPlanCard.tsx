import { Card } from "@/components/ui";
import type { FanClubPlan } from "@/types/fan-club";

type FanClubPlanCardProps = {
  plan: FanClubPlan;
};

export function FanClubPlanCard({ plan }: FanClubPlanCardProps) {
  return (
    <Card className="space-y-2">
      <p className="text-base font-black text-white">{plan.name}</p>
      {plan.description ? <p className="text-sm text-zinc-300">{plan.description}</p> : null}
      <p className="text-sm text-zinc-200">
        {plan.coin_price} coin / {plan.duration_days} ngày
      </p>
    </Card>
  );
}
