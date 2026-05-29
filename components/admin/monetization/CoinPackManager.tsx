"use client";

import { useActionState } from "react";
import { Button, Card, Input, SectionHeader } from "@/components/ui";
import { saveCoinPackAction } from "@/lib/admin/payment-admin-actions";
import type { CoinPack } from "@/types/payment";

type CoinPackManagerProps = {
  packs: CoinPack[];
};

const initialState = { ok: false, error: null as string | null };

function CoinPackForm({ pack }: { pack?: CoinPack }) {
  const [state, action, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => saveCoinPackAction(formData),
    initialState
  );
  const bonusPercent = pack?.bonus_percent ?? 0;
  const overBonusCap = bonusPercent > 15;

  return (
    <form action={action} className="space-y-2 rounded-xl border border-white/10 p-3">
      <input name="id" type="hidden" value={pack?.id ?? ""} />
      <div className="grid gap-2 sm:grid-cols-2">
        <Input defaultValue={pack?.name ?? ""} label="Tên pack" name="name" required />
        <Input
          defaultValue={String(pack?.base_coin_amount ?? 100)}
          label="Base coin amount"
          min={1}
          name="base_coin_amount"
          required
          type="number"
        />
        <Input
          defaultValue={String(pack?.bonus_coin_amount ?? 0)}
          label="Bonus coin"
          min={0}
          name="bonus_coin_amount"
          type="number"
        />
        <Input
          defaultValue={String(pack?.price_vnd ?? 10000)}
          label="Price VND"
          min={1}
          name="price_vnd"
          required
          type="number"
        />
        <Input
          defaultValue={pack?.label ?? ""}
          label="Label"
          name="label"
          placeholder="Gói thử / Cơ bản / Super Fan"
        />
        <Input
          defaultValue={String(pack?.sort_order ?? 0)}
          label="Sort order"
          name="sort_order"
          type="number"
        />
        <Input
          defaultValue={pack?.badge_text ?? ""}
          label="Badge text"
          name="badge_text"
          placeholder="Phổ biến / Tốt nhất"
        />
      </div>
      {pack ? (
        <p className={overBonusCap ? "text-sm text-amber-300" : "text-sm text-zinc-400"}>
          Bonus hiện tại: {bonusPercent}% {overBonusCap ? "(vượt trần 15%)" : ""}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <label className="text-sm text-zinc-300">
          <input
            defaultChecked={pack?.is_active ?? false}
            name="is_active"
            type="checkbox"
            value="true"
          />{" "}
          Active
        </label>
        <input name="currency" type="hidden" value="VND" />
      </div>
      {state.error ? <p className="text-sm text-red-300">{state.error}</p> : null}
      <Button loading={pending} type="submit" variant="secondary">
        {pack ? "Lưu pack" : "Tạo pack"}
      </Button>
    </form>
  );
}

export function CoinPackManager({ packs }: CoinPackManagerProps) {
  return (
    <Card className="space-y-4">
      <SectionHeader
        subtitle="Quản lý pack nạp cố định. Bonus tối đa khuyến nghị 15%."
        title="Gói coin"
      />
      <CoinPackForm />
      <div className="space-y-2">
        {packs.map((pack) => (
          <CoinPackForm key={pack.id} pack={pack} />
        ))}
      </div>
    </Card>
  );
}
