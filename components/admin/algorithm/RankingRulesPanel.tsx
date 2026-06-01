"use client";

import { AlgorithmCategoryPanel } from "@/components/admin/algorithm/AlgorithmCategoryPanel";
import { Card } from "@/components/ui";
import type {
  AlgorithmSettingRow,
  AlgorithmWeightValidation
} from "@/types/algorithm-settings";

type RankingRulesPanelProps = {
  settings: AlgorithmSettingRow[];
  weightValidations: AlgorithmWeightValidation[];
  canUpdate: boolean;
  onRefresh: () => void;
};

export function RankingRulesPanel({
  settings,
  weightValidations,
  canUpdate,
  onRefresh
}: RankingRulesPanelProps) {
  const freshness = Number(
    settings.find((s) => s.key === "ranking.weight.freshness")?.value ?? 0
  );
  const fairness = Number(
    settings.find((s) => s.key === "ranking.weight.fairness")?.value ?? 0
  );

  const warnings: string[] = [];
  if (freshness < 0.03) warnings.push("Freshness thấp — BXH dễ bị nội dung cũ thống trị.");
  if (fairness < 0.03) warnings.push("Fairness weight thấp — tác giả lớn có thể chiếm BXH.");

  return (
    <div className="space-y-4">
      <Card className="space-y-2 p-4">
        <p className="text-sm font-bold text-white">Ranking rules</p>
        <p className="text-sm text-zinc-400">
          Trending, completion, save và penalty manipulation. Decay và minimum sample: cấu hình trong
          Fair Distribution nếu đã bật migration FDS.
        </p>
        {warnings.map((w) => (
          <p className="text-xs text-amber-200/90" key={w}>
            ⚠ {w}
          </p>
        ))}
      </Card>

      <AlgorithmCategoryPanel
        canUpdate={canUpdate}
        categories={["ranking"]}
        onRefresh={onRefresh}
        settings={settings}
        weightValidations={weightValidations}
      />
    </div>
  );
}
