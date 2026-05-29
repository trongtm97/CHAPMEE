"use client";

import { useActionState } from "react";
import { Button, Card, Input, SectionHeader } from "@/components/ui";
import { saveGooglePlaySettingsAction } from "@/lib/admin/payment-admin-actions";
import type { MonetizationSettingsMap } from "@/types/monetization";

const initialState = { ok: false, error: null as string | null };

export function GooglePlaySettings({ settings }: { settings: MonetizationSettingsMap }) {
  const [state, action, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => saveGooglePlaySettingsAction(formData),
    initialState
  );

  return (
    <Card className="space-y-4">
      <SectionHeader
        title="Cấu hình Google Play Billing"
        subtitle="Foundation config cho Android in-app purchase (placeholder an toàn)."
      />

      <form action={action} className="space-y-3 rounded-xl border border-white/10 p-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-zinc-300">
            <input
              defaultChecked={Boolean(settings["payments.provider_google_play_billing_enabled"])}
              name="payments.provider_google_play_billing_enabled"
              type="checkbox"
              value="true"
            />{" "}
            Enabled
          </label>
          <label className="text-sm text-zinc-300">
            <input
              defaultChecked={Boolean(settings["payments.google_play.test_mode"])}
              name="payments.google_play.test_mode"
              type="checkbox"
              value="true"
            />{" "}
            Test mode
          </label>
          <label className="text-sm text-zinc-300">
            <input
              defaultChecked={Boolean(settings["payments.google_play.use_reduced_fee_estimate"])}
              name="payments.google_play.use_reduced_fee_estimate"
              type="checkbox"
              value="true"
            />{" "}
            Use reduced fee estimate
          </label>
          <label className="text-sm text-zinc-300">
            <input
              defaultChecked={Boolean(settings["payments.google_play.credentials_configured"])}
              name="payments.google_play.credentials_configured"
              type="checkbox"
              value="true"
            />{" "}
            Credentials configured
          </label>
        </div>

        <Input
          defaultValue={String(settings["payments.google_play.package_name"] ?? "")}
          label="Package name"
          name="payments.google_play.package_name"
          placeholder="com.chapchap.app"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            defaultValue={String(settings["payments.google_play.default_store_fee_percent"] ?? 15)}
            label="Default store fee (%)"
            max={100}
            min={0}
            name="payments.google_play.default_store_fee_percent"
            step={0.1}
            type="number"
          />
          <Input
            defaultValue={String(settings["payments.google_play.standard_fee_percent"] ?? 30)}
            label="Standard fee (%)"
            max={100}
            min={0}
            name="payments.google_play.standard_fee_percent"
            step={0.1}
            type="number"
          />
        </div>

        <p className="text-xs text-zinc-400">
          Credentials status:{" "}
          <span
            className={
              Boolean(settings["payments.google_play.credentials_configured"])
                ? "text-emerald-300"
                : "text-amber-300"
            }
          >
            {Boolean(settings["payments.google_play.credentials_configured"])
              ? "Configured"
              : "Not configured"}
          </span>
        </p>
        {state.error ? <p className="text-sm text-red-300">{state.error}</p> : null}
        <Button loading={pending} type="submit" variant="secondary">
          Lưu Google Play settings
        </Button>
      </form>
    </Card>
  );
}
