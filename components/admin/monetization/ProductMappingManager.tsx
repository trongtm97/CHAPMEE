"use client";

import { useActionState } from "react";
import { Button, Card, Input, SectionHeader } from "@/components/ui";
import { saveProviderProductMappingAction } from "@/lib/admin/payment-admin-actions";
import type { CoinPack, PaymentProviderProduct } from "@/types/payment";

const initialState = { ok: false, error: null as string | null };
const GOOGLE_PLAY_SUGGESTED_PRODUCT_IDS = [
  "chapchap_coin_200",
  "chapchap_coin_500",
  "chapchap_coin_1000",
  "chapchap_coin_2000",
  "chapchap_coin_5000",
  "chapchap_coin_10000"
];

function MappingForm({
  coinPacks,
  mapping
}: {
  coinPacks: CoinPack[];
  mapping?: PaymentProviderProduct;
}) {
  const [state, action, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) =>
      saveProviderProductMappingAction(formData),
    initialState
  );

  return (
    <form action={action} className="space-y-2 rounded-xl border border-white/10 p-3">
      <input name="id" type="hidden" value={mapping?.id ?? ""} />
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-sm text-zinc-300">
          Provider
          <select
            className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            defaultValue={mapping?.provider ?? "google_play"}
            name="provider"
          >
            <option value="google_play">google_play</option>
            <option value="apple_iap">apple_iap</option>
            <option value="sepay">sepay</option>
            <option value="manual">manual</option>
          </select>
        </label>
        <label className="text-sm text-zinc-300">
          Payment channel
          <select
            className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            defaultValue={mapping?.payment_channel ?? "google_play_billing"}
            name="payment_channel"
          >
            <option value="web_sepay">web_sepay</option>
            <option value="google_play_billing">google_play_billing</option>
            <option value="apple_iap">apple_iap</option>
            <option value="manual_admin">manual_admin</option>
          </select>
        </label>
        <Input
          defaultValue={mapping?.product_id ?? ""}
          label="Product ID"
          name="product_id"
          placeholder="chapchap_coin_1000"
          required
        />
        <label className="text-sm text-zinc-300">
          Coin pack
          <select
            className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            defaultValue={mapping?.coin_pack_id ?? ""}
            name="coin_pack_id"
            required
          >
            <option value="">Chọn coin pack</option>
            {coinPacks.map((pack) => (
              <option key={pack.id} value={pack.id}>
                {pack.name} ({pack.price_vnd.toLocaleString("vi-VN")} VND)
              </option>
            ))}
          </select>
        </label>
      </div>
      <Input
        defaultValue={
          mapping?.metadata ? JSON.stringify(mapping.metadata) : '{"source":"admin"}'
        }
        label="Metadata JSON"
        name="metadata_json"
      />
      <label className="text-sm text-zinc-300">
        <input
          defaultChecked={mapping?.is_active ?? true}
          name="is_active"
          type="checkbox"
          value="true"
        />{" "}
        Active
      </label>
      {state.error ? <p className="text-sm text-red-300">{state.error}</p> : null}
      <Button loading={pending} type="submit" variant="secondary">
        {mapping ? "Lưu mapping" : "Tạo mapping"}
      </Button>
    </form>
  );
}

export function ProductMappingManager({
  coinPacks,
  mappings
}: {
  coinPacks: CoinPack[];
  mappings: PaymentProviderProduct[];
}) {
  return (
    <Card className="space-y-4">
      <SectionHeader
        title="Ánh xạ sản phẩm"
        subtitle="Mapping coin packs với product IDs cho Google Play / Apple IAP tương lai."
      />
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <p className="text-sm font-semibold text-white">Google Play suggested product IDs</p>
        <p className="mt-1 text-xs text-zinc-400">{GOOGLE_PLAY_SUGGESTED_PRODUCT_IDS.join(", ")}</p>
      </div>
      <MappingForm coinPacks={coinPacks} />
      <div className="space-y-2">
        {mappings.map((mapping) => (
          <MappingForm coinPacks={coinPacks} key={mapping.id} mapping={mapping} />
        ))}
      </div>
    </Card>
  );
}
