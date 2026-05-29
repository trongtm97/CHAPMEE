"use client";

import { useActionState, useMemo, useState } from "react";
import {
  INITIAL_MONETIZATION_ACTION_STATE,
  resetMonetizationSettingsAction,
  updateMonetizationSettingsAction
} from "@/lib/admin/monetization-actions";
import { Card, SectionHeader, Button, Input } from "@/components/ui";
import { FeatureFlagSwitch } from "@/components/admin/monetization/FeatureFlagSwitch";
import { RevenueShareSettings } from "@/components/admin/monetization/RevenueShareSettings";
import type {
  MonetizationConfigKey,
  MonetizationSettingDefinition,
  MonetizationSettingGroup,
  MonetizationSettingValue,
  MonetizationSettingsMap
} from "@/types/monetization";

type MonetizationSettingsPanelProps = {
  definitions: MonetizationSettingDefinition[];
  initialSettings: MonetizationSettingsMap;
  updatedAt: string | null;
};

const GROUP_TITLES: Record<MonetizationSettingGroup, string> = {
  overview: "Tổng quan",
  coin: "Coin",
  payments: "Payment providers",
  creator: "Monetization tác giả",
  revenue_share: "Revenue share",
  modules: "Modules",
  payout: "Payout",
  fraud: "Fraud protection"
};

function isToggle(definition: MonetizationSettingDefinition) {
  return definition.inputType === "boolean";
}

export function MonetizationSettingsPanel({
  definitions,
  initialSettings,
  updatedAt
}: MonetizationSettingsPanelProps) {
  const [values, setValues] = useState<MonetizationSettingsMap>(initialSettings);
  const [saveState, saveAction, savePending] = useActionState(
    updateMonetizationSettingsAction,
    INITIAL_MONETIZATION_ACTION_STATE
  );
  const [resetState, resetAction, resetPending] = useActionState(
    resetMonetizationSettingsAction,
    INITIAL_MONETIZATION_ACTION_STATE
  );

  const grouped = useMemo(() => {
    const groups = new Map<MonetizationSettingGroup, MonetizationSettingDefinition[]>();
    for (const definition of definitions) {
      const list = groups.get(definition.group) ?? [];
      list.push(definition);
      groups.set(definition.group, list);
    }
    return groups;
  }, [definitions]);

  const latestMessage = resetState.message ?? saveState.message;
  const latestOk = resetState.message ? resetState.ok : saveState.ok;
  const effectiveUpdatedAt = resetState.updatedAt ?? saveState.updatedAt ?? updatedAt;

  const dangerWarnings = useMemo(() => {
    const warnings: string[] = [];

    if (values["monetization.enabled"] && !values["payments.enabled"]) {
      warnings.push("Monetization tổng đã bật nhưng payment tổng đang tắt.");
    }
    if (
      values["monetization.enabled"] &&
      values["coin.purchase_enabled"] &&
      !values["coin.enabled"]
    ) {
      warnings.push("coin.purchase_enabled bật trong khi coin.enabled đang tắt.");
    }
    if (
      Number(values["revenue_share.default_creator_percent"]) +
        Number(values["revenue_share.default_platform_percent"]) !==
      100
    ) {
      warnings.push("Revenue share mặc định không cộng đủ 100%.");
    }
    if (
      Number(values["revenue_share.paid_chapter_creator_percent"]) > 100 ||
      Number(values["revenue_share.early_access_creator_percent"]) > 100 ||
      Number(values["revenue_share.tip_creator_percent"]) > 100 ||
      Number(values["revenue_share.gift_creator_percent"]) > 100 ||
      Number(values["revenue_share.fan_club_creator_percent"]) > 100
    ) {
      warnings.push("Creator share > 100% sẽ làm platform net âm.");
    }

    return warnings;
  }, [values]);

  function updateValue(key: MonetizationConfigKey, value: MonetizationSettingValue) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <SectionHeader
          subtitle="Mặc định mọi module tiền OFF. Chỉ admin/founder mới có thể cập nhật."
          title="Cấu hình kiếm tiền"
        />
        <p className="text-xs text-zinc-400">
          Last updated: {effectiveUpdatedAt ? new Date(effectiveUpdatedAt).toLocaleString() : "Never"}
        </p>
        {latestMessage ? (
          <p
            className={`rounded-xl border px-3 py-2 text-sm ${
              latestOk
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                : "border-red-400/30 bg-red-400/10 text-red-100"
            }`}
          >
            {latestMessage}
          </p>
        ) : null}

        {dangerWarnings.length > 0 ? (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
            <p className="font-semibold">Cảnh báo cấu hình</p>
            <ul className="mt-1 space-y-1">
              {dangerWarnings.map((warning) => (
                <li key={warning}>- {warning}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <form action={saveAction} className="space-y-6">
          <input
            name="settingsPayload"
            type="hidden"
            value={JSON.stringify(values)}
          />

          {Array.from(grouped.entries()).map(([groupKey, groupDefinitions]) => (
            <Card className="space-y-3 border-white/10 bg-white/[0.02] p-4" key={groupKey}>
              <h3 className="text-base font-black text-white">{GROUP_TITLES[groupKey]}</h3>

              {groupKey === "revenue_share" ? (
                <RevenueShareSettings
                  definitions={groupDefinitions}
                  onChange={updateValue}
                  values={values}
                />
              ) : (
                <div className="space-y-3">
                  {groupDefinitions.map((definition) =>
                    isToggle(definition) ? (
                      <FeatureFlagSwitch
                        checked={Boolean(values[definition.key])}
                        description={definition.description}
                        key={definition.key}
                        label={definition.label}
                        onChange={(checked) => updateValue(definition.key, checked)}
                      />
                    ) : definition.inputType === "number" ? (
                      <Input
                        key={definition.key}
                        label={definition.label}
                        max={definition.max}
                        min={definition.min}
                        onChange={(event) =>
                          updateValue(definition.key, Number(event.currentTarget.value))
                        }
                        step={definition.step}
                        type="number"
                        value={String(values[definition.key] ?? definition.defaultValue)}
                      />
                    ) : (
                      <Input
                        key={definition.key}
                        label={definition.label}
                        onChange={(event) =>
                          updateValue(definition.key, event.currentTarget.value)
                        }
                        type="text"
                        value={String(values[definition.key] ?? definition.defaultValue)}
                      />
                    )
                  )}
                </div>
              )}
            </Card>
          ))}

          <div className="flex flex-wrap gap-3">
            <Button loading={savePending} type="submit" variant="primary">
              Lưu cấu hình
            </Button>
          </div>
        </form>

        <form action={resetAction}>
          <Button loading={resetPending} type="submit" variant="danger">
            Reset về default
          </Button>
        </form>
      </Card>
    </div>
  );
}
