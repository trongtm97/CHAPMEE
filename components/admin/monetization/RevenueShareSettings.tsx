"use client";

import { Input } from "@/components/ui";
import { FeatureFlagSwitch } from "@/components/admin/monetization/FeatureFlagSwitch";
import type {
  MonetizationConfigKey,
  MonetizationSettingDefinition,
  MonetizationSettingValue
} from "@/types/monetization";

type RevenueShareSettingsProps = {
  definitions: MonetizationSettingDefinition[];
  onChange: (key: MonetizationConfigKey, value: MonetizationSettingValue) => void;
  values: Record<MonetizationConfigKey, MonetizationSettingValue>;
};

export function RevenueShareSettings({
  definitions,
  onChange,
  values
}: RevenueShareSettingsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {definitions.map((definition) => (
        definition.inputType === "boolean" ? (
          <FeatureFlagSwitch
            key={definition.key}
            checked={Boolean(values[definition.key])}
            description={definition.description}
            label={definition.label}
            onChange={(checked) => onChange(definition.key, checked)}
          />
        ) : (
          <Input
            key={definition.key}
            label={definition.label}
            max={definition.max}
            min={definition.min}
            onChange={(event) =>
              onChange(definition.key, Number(event.currentTarget.value))
            }
            step={definition.step}
            type="number"
            value={String(values[definition.key] ?? definition.defaultValue)}
          />
        )
      ))}
    </div>
  );
}
