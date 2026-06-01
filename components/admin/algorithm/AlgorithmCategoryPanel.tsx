"use client";

import { useState, useTransition } from "react";
import { AlgorithmSettingField } from "@/components/admin/algorithm/AlgorithmSettingField";
import { Button, Card } from "@/components/ui";
import { normalizeAlgorithmWeightsAction } from "@/lib/admin/algorithm-settings-actions";
import { ALGORITHM_WEIGHT_GROUPS } from "@/lib/algorithm/weight-groups";
import type {
  AlgorithmSettingCategory,
  AlgorithmSettingRow,
  AlgorithmWeightValidation
} from "@/types/algorithm-settings";

type AlgorithmCategoryPanelProps = {
  categories: AlgorithmSettingCategory[];
  settings: AlgorithmSettingRow[];
  weightValidations: AlgorithmWeightValidation[];
  canUpdate: boolean;
  onRefresh: () => void;
};

export function AlgorithmCategoryPanel({
  categories,
  settings,
  weightValidations,
  canUpdate,
  onRefresh
}: AlgorithmCategoryPanelProps) {
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

  const filtered = settings.filter((s) => categories.includes(s.category));
  const relevantValidations = weightValidations.filter((v) =>
    categories.some((cat) =>
      ALGORITHM_WEIGHT_GROUPS.find((g) => g.id === v.groupId)?.category === cat
    )
  );

  function showToast(text: string | null, ok: boolean) {
    setToast(text ? { text, ok } : null);
    if (text) {
      window.setTimeout(() => setToast(null), 4000);
    }
  }

  function normalizeCategory(category: AlgorithmSettingCategory) {
    startTransition(async () => {
      const result = await normalizeAlgorithmWeightsAction(category);
      showToast(result.message, result.ok);
      if (result.ok) onRefresh();
    });
  }

  return (
    <div className="space-y-4">
      {toast ? (
        <p
          className={`rounded-xl px-4 py-2 text-sm ${
            toast.ok
              ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
              : "border border-red-400/30 bg-red-400/10 text-red-100"
          }`}
        >
          {toast.text}
        </p>
      ) : null}

      {relevantValidations.map((validation) => (
        <Card
          className={`space-y-2 p-4 ${validation.isValid ? "border-white/10" : "border-amber-400/30 bg-amber-400/5"}`}
          key={validation.groupId}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-white">{validation.label}</p>
            <p className="text-sm text-zinc-300">
              Tổng:{" "}
              <span className={validation.isValid ? "text-emerald-300" : "text-amber-300"}>
                {validation.sum}
              </span>{" "}
              / {validation.targetSum}
            </p>
          </div>
          {!validation.isValid && canUpdate ? (
            <Button
              disabled={pending}
              onClick={() => {
                const group = ALGORITHM_WEIGHT_GROUPS.find((g) => g.id === validation.groupId);
                if (group) normalizeCategory(group.category);
              }}
              type="button"
              variant="ghost"
            >
              Chuẩn hóa về 1.0
            </Button>
          ) : null}
        </Card>
      ))}

      {filtered.map((setting) => (
        <AlgorithmSettingField
          canUpdate={canUpdate}
          key={setting.key}
          onSaved={onRefresh}
          setting={setting}
        />
      ))}
    </div>
  );
}
