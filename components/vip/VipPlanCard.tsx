import { Card } from "@/components/ui";
import type { VipPlan } from "@/types/vip";

type VipPlanCardProps = {
  plan: VipPlan;
};

export function VipPlanCard({ plan }: VipPlanCardProps) {
  return (
    <Card className="space-y-2">
      <p className="text-lg font-black text-white">{plan.name}</p>
      {plan.description ? <p className="text-sm text-zinc-300">{plan.description}</p> : null}
      <p className="text-sm text-zinc-200">
        {plan.price_vnd.toLocaleString("vi-VN")} VND / {plan.duration_days} ngày
      </p>
      <p className="text-sm text-zinc-300">Bonus: {plan.coin_bonus_amount} coin</p>
    </Card>
  );
}
