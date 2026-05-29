"use client";

import { useActionState } from "react";
import { Button, Card, Input, SectionHeader } from "@/components/ui";
import { saveProviderSettingAction } from "@/lib/admin/payment-admin-actions";
import type { PaymentProviderSetting } from "@/types/payment";

const initialState = { ok: false, error: null as string | null };

function ProviderRow({ provider }: { provider: PaymentProviderSetting }) {
  const [state, action, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => saveProviderSettingAction(formData),
    initialState
  );

  return (
    <form action={action} className="space-y-2 rounded-xl border border-white/10 p-3">
      <input name="provider_key" type="hidden" value={provider.provider_key} />
      <p className="text-sm font-semibold text-white">{provider.provider_key}</p>
      <div className="flex flex-wrap gap-4">
        <label className="text-sm text-zinc-300">
          <input
            defaultChecked={provider.enabled}
            name="enabled"
            type="checkbox"
            value="true"
          />{" "}
          Enabled
        </label>
        <label className="text-sm text-zinc-300">
          <input
            defaultChecked={provider.test_mode}
            name="test_mode"
            type="checkbox"
            value="true"
          />{" "}
          Test mode
        </label>
      </div>
      <Input
        defaultValue={provider.private_config_reference ?? ""}
        label="Private config reference"
        name="private_config_reference"
        placeholder="env://..."
      />
      {state.error ? <p className="text-sm text-red-300">{state.error}</p> : null}
      <Button loading={pending} type="submit" variant="secondary">
        Lưu provider
      </Button>
    </form>
  );
}

export function PaymentProviderSettings({
  providers
}: {
  providers: PaymentProviderSetting[];
}) {
  return (
    <Card className="space-y-4">
      <SectionHeader
        subtitle="Bật/tắt provider và cấu hình test mode."
        title="Cổng thanh toán"
      />
      <div className="space-y-2">
        {providers.map((provider) => (
          <ProviderRow key={provider.provider_key} provider={provider} />
        ))}
      </div>
    </Card>
  );
}
