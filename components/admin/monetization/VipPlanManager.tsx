"use client";

import { useActionState } from "react";
import { Button, Card, Input } from "@/components/ui";
import { saveVipPlanAction } from "@/lib/admin/vip-actions";
import type { VipPlan } from "@/types/vip";

const initialState = { ok: false, error: null as string | null };

type VipPlanManagerProps = {
  plans: VipPlan[];
};

export function VipPlanManager({ plans }: VipPlanManagerProps) {
  const [state, action, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => saveVipPlanAction(formData),
    initialState
  );

  return (
    <Card className="space-y-4">
      <h2 className="text-lg font-black text-white">VIP Plans</h2>
      <form action={action} className="space-y-3 rounded-xl border border-white/10 p-3">
        <p className="text-sm font-semibold text-zinc-100">Tạo / Cập nhật plan</p>
        <Input label="Plan ID (để trống nếu tạo mới)" name="id" />
        <Input label="Tên plan" name="name" required />
        <Input label="Mô tả" name="description" />
        <Input label="Giá (VND)" min={0} name="price_vnd" required type="number" />
        <Input label="Số ngày" min={1} name="duration_days" required type="number" />
        <Input label="Coin bonus" min={0} name="coin_bonus_amount" type="number" />
        <Input label="Sort order" min={0} name="sort_order" type="number" />
        <label className="flex items-center gap-2 text-sm text-zinc-100">
          <input defaultChecked name="is_active" type="checkbox" value="true" />
          Active
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-zinc-100">
            <input name="benefit_no_ads" type="checkbox" value="true" />
            no_ads
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-100">
            <input defaultChecked name="benefit_vip_badge" type="checkbox" value="true" />
            vip_badge
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-100">
            <input name="benefit_exclusive_theme" type="checkbox" value="true" />
            exclusive_theme
          </label>
          <Input
            label="monthly_coin_bonus"
            min={0}
            name="benefit_monthly_coin_bonus"
            type="number"
          />
          <Input
            label="early_access_discount_percent"
            min={0}
            max={100}
            name="benefit_early_access_discount_percent"
            type="number"
          />
          <Input
            label="paid_chapter_discount_percent"
            min={0}
            max={100}
            name="benefit_paid_chapter_discount_percent"
            type="number"
          />
        </div>
        {state.error ? <p className="text-sm text-red-300">{state.error}</p> : null}
        <Button loading={pending} type="submit">Lưu VIP plan</Button>
      </form>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-zinc-100">Plans hiện có</p>
        {plans.length === 0 ? (
          <p className="text-sm text-zinc-400">Chưa có VIP plan.</p>
        ) : (
          plans.map((plan) => (
            <div className="rounded-xl border border-white/10 p-3 text-sm" key={plan.id}>
              <p className="font-semibold text-white">{plan.name}</p>
              <p className="text-zinc-300">
                {plan.price_vnd.toLocaleString("vi-VN")} VND / {plan.duration_days} ngày
              </p>
              <p className="text-zinc-400">Active: {String(plan.is_active)}</p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
