"use client";

import { useActionState } from "react";
import { Button, Card, Input } from "@/components/ui";
import { saveFanClubPlanAction } from "@/lib/creator/fan-club-actions";
import type { FanClubPlan } from "@/types/fan-club";

const initialState = { ok: false, error: null as string | null };

type FanClubManagerProps = {
  plans: FanClubPlan[];
  allowStorySpecific: boolean;
  minCoinPrice: number;
  maxCoinPrice: number;
  defaultDurationDays: number;
};

export function FanClubManager({
  plans,
  allowStorySpecific,
  minCoinPrice,
  maxCoinPrice,
  defaultDurationDays
}: FanClubManagerProps) {
  const [state, action, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => saveFanClubPlanAction(formData),
    initialState
  );

  return (
    <Card className="space-y-3">
      <p className="text-base font-black text-white">Fan Club Management</p>
      <form action={action} className="space-y-2">
        <Input label="Plan name" name="name" required />
        <Input label="Description" name="description" />
        <Input label="Coin price" name="coin_price" type="number" min={minCoinPrice} max={maxCoinPrice} required />
        <Input label="Duration days" name="duration_days" type="number" min={1} defaultValue={String(defaultDurationDays)} required />
        {allowStorySpecific ? <Input label="Story ID (optional)" name="story_id" /> : null}
        <label className="flex items-center gap-2 text-sm text-zinc-100">
          <input defaultChecked name="is_active" type="checkbox" value="true" />
          Active
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-100">
          <input defaultChecked name="benefit_fan_badge" type="checkbox" value="true" />
          fan_badge
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-100">
          <input name="benefit_exclusive_poll" type="checkbox" value="true" />
          exclusive_poll
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-100">
          <input name="benefit_comment_highlight" type="checkbox" value="true" />
          comment_highlight
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-100">
          <input name="benefit_bonus_chapter_access" type="checkbox" value="true" />
          bonus_chapter_access
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-100">
          <input name="benefit_thank_you_wall" type="checkbox" value="true" />
          thank_you_wall
        </label>
        <Input
          label="early_access_discount_percent"
          name="benefit_early_access_discount_percent"
          type="number"
          min={0}
          max={100}
        />
        {state.error ? <p className="text-sm text-red-300">{state.error}</p> : null}
        <Button loading={pending} type="submit">Lưu Fan Club plan</Button>
      </form>
      <div className="space-y-2">
        {plans.map((plan) => (
          <div className="rounded-xl border border-white/10 p-2 text-sm" key={plan.id}>
            <p className="font-semibold text-white">{plan.name}</p>
            <p className="text-zinc-300">{plan.coin_price} coin / {plan.duration_days} ngày</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
