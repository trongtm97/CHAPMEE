"use client";

import { AlgorithmCategoryPanel } from "@/components/admin/algorithm/AlgorithmCategoryPanel";
import { Card } from "@/components/ui";
import type {
  AlgorithmSettingRow,
  AlgorithmWeightValidation
} from "@/types/algorithm-settings";

type SafetySpamPanelProps = {
  settings: AlgorithmSettingRow[];
  weightValidations: AlgorithmWeightValidation[];
  canUpdate: boolean;
  onRefresh: () => void;
};

export function SafetySpamPanel({
  settings,
  weightValidations,
  canUpdate,
  onRefresh
}: SafetySpamPanelProps) {
  const rules = settings.filter(
    (s) => (s.category === "safety" || s.category === "spam") && s.is_active
  );

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <p className="text-sm font-bold text-white">An toàn & spam</p>
        <p className="text-sm text-zinc-400">
          Báo cáo, ẩn, policy warning, duplicate và tag abuse.
        </p>
        <ul className="space-y-1 text-sm">
          {rules.length === 0 ? (
            <li className="text-zinc-500">Không có rule active.</li>
          ) : (
            rules.map((r) => (
              <li
                className="flex items-center justify-between gap-2 rounded-lg border border-white/5 px-2 py-1.5"
                key={r.key}
              >
                <span className="text-zinc-300">{r.label}</span>
                <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                  Active
                </span>
              </li>
            ))
          )}
        </ul>
      </Card>

      <AlgorithmCategoryPanel
        canUpdate={canUpdate}
        categories={["safety", "spam"]}
        onRefresh={onRefresh}
        settings={settings}
        weightValidations={weightValidations}
      />
    </div>
  );
}
