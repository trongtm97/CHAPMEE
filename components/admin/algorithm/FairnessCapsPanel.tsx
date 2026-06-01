"use client";

import { AlgorithmCategoryPanel } from "@/components/admin/algorithm/AlgorithmCategoryPanel";
import { Card } from "@/components/ui";
import type {
  AlgorithmSettingCategory,
  AlgorithmSettingRow,
  AlgorithmWeightValidation
} from "@/types/algorithm-settings";

type FairnessCapsPanelProps = {
  settings: AlgorithmSettingRow[];
  weightValidations: AlgorithmWeightValidation[];
  canUpdate: boolean;
  onRefresh: () => void;
};

function readNumber(settings: AlgorithmSettingRow[], key: string, fallback: number) {
  const row = settings.find((s) => s.key === key);
  const v = row?.value;
  return typeof v === "number" ? v : fallback;
}

export function FairnessCapsPanel({
  settings,
  weightValidations,
  canUpdate,
  onRefresh
}: FairnessCapsPanelProps) {
  const authorCap = readNumber(settings, "fairness.author_exposure_cap_7d_percent", 10);
  const storyCap = readNumber(settings, "fairness.story_exposure_cap_7d_percent", 8);
  const longTailSlots = readNumber(settings, "fairness.min_long_tail_slots_percent", 10);

  const warnings: string[] = [];
  if (authorCap < 5) warnings.push("Cap tác giả quá chặt — có thể giảm relevance.");
  if (authorCap > 25) warnings.push("Cap tác giả quá lỏng — dễ độc quyền hiển thị.");
  if (storyCap < 4) warnings.push("Cap truyện quá chặt.");
  if (storyCap > 20) warnings.push("Cap truyện quá lỏng — một truyện có thể chiếm feed.");
  if (longTailSlots < 5) warnings.push("% slot long-tail thấp — diversity kém.");

  return (
    <div className="space-y-4">
      <Card className="space-y-2 p-4">
        <p className="text-sm font-bold text-white">Fairness caps</p>
        <p className="text-sm text-zinc-400">
          Giới hạn exposure theo tác giả, truyện, taxonomy và slot diversity. Preview dựa trên giá
          trị hiện tại trong DB.
        </p>
        <div className="grid gap-2 sm:grid-cols-3 text-sm">
          <PreviewStat label="Cap author (7d)" value={`${authorCap}%`} />
          <PreviewStat label="Cap story (7d)" value={`${storyCap}%`} />
          <PreviewStat label="Long-tail slots min" value={`${longTailSlots}%`} />
        </div>
        {warnings.length > 0 ? (
          <ul className="mt-2 space-y-1 text-xs text-amber-200/90">
            {warnings.map((w) => (
              <li key={w}>⚠ {w}</li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-emerald-200/80">Caps trong ngưỡng gợi ý vận hành.</p>
        )}
      </Card>

      <AlgorithmCategoryPanel
        canUpdate={canUpdate}
        categories={["fairness"] satisfies AlgorithmSettingCategory[]}
        onRefresh={onRefresh}
        settings={settings}
        weightValidations={weightValidations}
      />
    </div>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="font-bold text-white">{value}</p>
    </div>
  );
}
