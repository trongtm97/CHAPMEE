"use client";

import { AlgorithmCategoryPanel } from "@/components/admin/algorithm/AlgorithmCategoryPanel";
import { Card } from "@/components/ui";
import type {
  AlgorithmSettingRow,
  AlgorithmWeightValidation
} from "@/types/algorithm-settings";

type QualityPenaltiesPanelProps = {
  settings: AlgorithmSettingRow[];
  weightValidations: AlgorithmWeightValidation[];
  canUpdate: boolean;
  onRefresh: () => void;
};

export function QualityPenaltiesPanel({
  settings,
  weightValidations,
  canUpdate,
  onRefresh
}: QualityPenaltiesPanelProps) {
  const penaltyKeys = settings.filter(
    (s) =>
      s.category === "safety" &&
      s.is_active &&
      (s.key.includes("penalty") || s.key.includes("report") || s.key.includes("hide"))
  );

  return (
    <div className="space-y-4">
      <Card className="space-y-2 p-4">
        <p className="text-sm font-bold text-white">Quality penalties</p>
        <p className="text-sm text-zinc-400">
          Điểm trừ từ báo cáo, moderation, completion thấp (qua ranking weights). Bảng nội dung bị
          phạt chi tiết: dùng Exposure audit hoặc Content Quality admin.
        </p>
        <p className="text-xs text-zinc-500">
          {penaltyKeys.length} rule penalty/safety đang bật trong cấu hình.
        </p>
      </Card>

      <AlgorithmCategoryPanel
        canUpdate={canUpdate}
        categories={["safety"]}
        onRefresh={onRefresh}
        settings={settings}
        weightValidations={weightValidations}
      />

      <Card className="p-4 text-sm text-zinc-500">
        Danh sách nội dung đang bị phạt chất lượng (pagination) — chờ nối API quality_penalties.
      </Card>
    </div>
  );
}
