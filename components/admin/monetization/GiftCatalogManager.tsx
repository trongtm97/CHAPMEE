"use client";

import { useActionState } from "react";
import { Button, Card, Input, SectionHeader } from "@/components/ui";
import { saveVirtualGiftAction } from "@/lib/admin/monetization-gifts-actions";
import type { VirtualGift } from "@/types/gift";

const initialState = { ok: false, error: null as string | null };

function GiftForm({ gift }: { gift?: VirtualGift }) {
  const [state, action, pending] = useActionState(saveVirtualGiftAction, initialState);

  return (
    <form action={action} className="space-y-2 rounded-xl border border-white/10 p-3">
      <input name="id" type="hidden" value={gift?.id ?? ""} />
      <div className="grid gap-2 sm:grid-cols-2">
        <Input defaultValue={gift?.key ?? ""} label="Key" name="key" required />
        <Input defaultValue={gift?.name ?? ""} label="Name" name="name" required />
        <Input
          defaultValue={String(gift?.coin_price ?? 10)}
          label="Coin price"
          min={1}
          name="coin_price"
          type="number"
        />
        <Input defaultValue={gift?.emoji ?? ""} label="Emoji" name="emoji" />
        <Input
          defaultValue={gift?.description ?? ""}
          label="Description"
          name="description"
        />
        <Input
          defaultValue={String(gift?.sort_order ?? 0)}
          label="Sort order"
          name="sort_order"
          type="number"
        />
      </div>
      <label className="text-sm text-zinc-300">
        <input
          defaultChecked={gift?.is_active ?? false}
          name="is_active"
          type="checkbox"
          value="true"
        />{" "}
        Active
      </label>
      <select
        className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
        defaultValue={gift?.rarity ?? "common"}
        name="rarity"
      >
        <option value="common">common</option>
        <option value="rare">rare</option>
        <option value="epic">epic</option>
        <option value="legendary">legendary</option>
      </select>
      {state.error ? <p className="text-sm text-red-300">{state.error}</p> : null}
      <Button loading={pending} type="submit" variant="secondary">
        {gift ? "Lưu gift" : "Tạo gift"}
      </Button>
    </form>
  );
}

export function GiftCatalogManager({ gifts }: { gifts: VirtualGift[] }) {
  return (
    <Card className="space-y-3">
      <SectionHeader subtitle="Quản lý catalog quà ảo." title="Danh mục quà" />
      <GiftForm />
      <div className="space-y-2">
        {gifts.map((gift) => (
          <GiftForm gift={gift} key={gift.id} />
        ))}
      </div>
    </Card>
  );
}
