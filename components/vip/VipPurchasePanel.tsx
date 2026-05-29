"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import { purchaseVipMockAction } from "@/lib/monetization/vip";
import type { VipPlan } from "@/types/vip";
import { VipPlanCard } from "@/components/vip/VipPlanCard";

type VipPurchasePanelProps = {
  plans: VipPlan[];
  testMode: boolean;
  mockPurchaseEnabled: boolean;
};

const initialState = { ok: false, error: null as string | null };

async function purchaseAction(_prev: typeof initialState, formData: FormData) {
  const planId = String(formData.get("plan_id") ?? "");
  return purchaseVipMockAction(planId);
}

export function VipPurchasePanel({
  plans,
  testMode,
  mockPurchaseEnabled
}: VipPurchasePanelProps) {
  const [state, action, pending] = useActionState(purchaseAction, initialState);

  if (plans.length === 0) {
    return <p className="text-sm text-zinc-400">Chưa có VIP plan active.</p>;
  }

  return (
    <div className="space-y-4">
      {plans.map((plan) => (
        <form action={action} className="space-y-2" key={plan.id}>
          <input name="plan_id" type="hidden" value={plan.id} />
          <VipPlanCard plan={plan} />
          {testMode && mockPurchaseEnabled ? (
            <Button loading={pending} type="submit">
              Nâng cấp VIP (mock test)
            </Button>
          ) : (
            <p className="text-sm text-zinc-400">
              Billing thật chưa tích hợp trong môi trường này.
            </p>
          )}
        </form>
      ))}
      {state.error ? <p className="text-sm text-red-300">{state.error}</p> : null}
      {state.ok ? <p className="text-sm text-emerald-300">Kích hoạt VIP thành công.</p> : null}
    </div>
  );
}
