"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui";
import type { TaxonomyQualityRuleRow } from "@/types/content-taxonomy-quality";

const THRESHOLD_FIELDS: Record<
  string,
  Array<{ key: string; label: string; min?: number; max?: number; step?: number }>
> = {
  too_many_tags: [
    { key: "max_subgenre", label: "Max subgenre", min: 1, max: 10 },
    { key: "max_trope_tag", label: "Max trope tag", min: 1, max: 30 },
    { key: "max_setting_tag", label: "Max setting tag", min: 1, max: 20 },
    { key: "max_character_tag", label: "Max character tag", min: 1, max: 20 },
    { key: "max_relationship_tag", label: "Max relationship tag", min: 1, max: 10 },
    { key: "max_reader_experience", label: "Max reader experience", min: 1, max: 15 }
  ],
  hot_tag_abuse: [
    { key: "max_featured_tags", label: "Max featured tags", min: 1, max: 20 },
    { key: "report_threshold_wrong_tag", label: "Ngưỡng report sai tag", min: 1, max: 50 },
    {
      key: "min_discovery_score",
      label: "Min discovery score (0–1, -1 = tắt)",
      min: -1,
      max: 1,
      step: 0.01
    }
  ],
  missing_warning: [
    { key: "report_threshold", label: "Ngưỡng report thiếu cảnh báo", min: 1, max: 50 }
  ],
  user_reported_wrong_tag: [
    { key: "report_threshold", label: "Ngưỡng report sai tag", min: 1, max: 50 }
  ],
  import_error: [
    { key: "invalid_slug_threshold", label: "Ngưỡng slug không hợp lệ (batch)", min: 1, max: 100 },
    {
      key: "missing_required_threshold",
      label: "Ngưỡng thiếu field bắt buộc (batch)",
      min: 1,
      max: 100
    }
  ],
  taxonomy_behavior_mismatch: [
    { key: "min_impressions", label: "Min impressions (14 ngày)", min: 5, max: 500 },
    {
      key: "bounce_threshold",
      label: "Ngưỡng bounce (0–1)",
      min: 0.5,
      max: 0.99,
      step: 0.01
    }
  ]
};

type Props = {
  rule: TaxonomyQualityRuleRow;
  disabled?: boolean;
  onSave: (config: Record<string, unknown>) => void;
};

export function TaxonomyQualityRuleConfigEditor({ rule, disabled, onSave }: Props) {
  const fields = THRESHOLD_FIELDS[rule.ruleKey] ?? [];
  const [draft, setDraft] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const field of fields) {
      const value = rule.config[field.key];
      if (typeof value === "number") initial[field.key] = value;
    }
    return initial;
  });

  const dirty = useMemo(() => {
    return fields.some((field) => {
      const current = rule.config[field.key];
      const next = draft[field.key];
      return typeof next === "number" && next !== current;
    });
  }, [draft, fields, rule.config]);

  if (fields.length === 0) {
    return (
      <pre className="mt-3 overflow-x-auto rounded-lg bg-zinc-950 p-3 text-xs text-zinc-400">
        {JSON.stringify(rule.config, null, 2)}
      </pre>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <label className="text-xs text-zinc-400" key={field.key}>
            {field.label}
            <input
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-2 py-2 text-sm text-white"
              disabled={disabled}
              max={field.max}
              min={field.min ?? 0}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  [field.key]: Number(e.target.value)
                }))
              }
              step={field.step ?? 1}
              type="number"
              value={draft[field.key] ?? ""}
            />
          </label>
        ))}
      </div>
      {dirty ? (
        <Button
          disabled={disabled}
          onClick={() =>
            onSave({
              ...rule.config,
              ...draft
            })
          }
          type="button"
        >
          Lưu threshold
        </Button>
      ) : null}
    </div>
  );
}
