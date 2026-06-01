"use client";

import { AlgorithmCategoryPanel } from "@/components/admin/algorithm/AlgorithmCategoryPanel";
import { Card } from "@/components/ui";
import { ALGORITHM_WEIGHT_GROUPS } from "@/lib/algorithm/weight-groups";
import type {
  AlgorithmSettingCategory,
  AlgorithmSettingRow,
  AlgorithmWeightValidation
} from "@/types/algorithm-settings";

const SURFACE_COPY: Record<
  AlgorithmSettingCategory,
  { title: string; description: string }
> = {
  reels: {
    title: "Reels",
    description:
      "Trọng số feed Reels: cá nhân hóa, trending, nội dung mới và long-tail. Tổng nhóm weight phải bằng 1."
  },
  discover: {
    title: "Khám phá",
    description:
      "Trọng số Discover: fresh, growing, completed và tác giả mới. Cân bằng relevance và diversity."
  },
  search: {
    title: "Tìm kiếm",
    description:
      "Trọng số ranking tìm kiếm: text relevance, quality, exact match, freshness, fairness."
  },
  ranking: {
    title: "Bảng xếp hạng",
    description:
      "Trọng số BXH: completion, save, follow, unlock. Penalty báo cáo/ẩn nằm ngoài nhóm Σ=1."
  },
  cold_start: { title: "", description: "" },
  fairness: { title: "", description: "" },
  safety: { title: "", description: "" },
  spam: { title: "", description: "" },
  monetization: { title: "", description: "" },
  system: { title: "", description: "" }
};

const WEIGHT_HINTS: Record<string, string> = {
  personalized: "Ưu tiên theo sở thích và lịch sử người dùng.",
  trending_quality: "Nội dung đang có tín hiệu chất lượng cao.",
  new_under_exposed: "Boost nội dung mới hoặc ít được phân phối.",
  followed_author: "Tác giả người dùng đang theo dõi.",
  long_tail_quality: "Long-tail chất lượng, tránh chỉ top hit.",
  fresh: "Độ mới của truyện/chương.",
  growing: "Tín hiệu đang tăng trưởng.",
  text_relevance: "Khớp từ khóa và ngữ nghĩa truy vấn.",
  quality: "Điểm chất lượng tổng hợp.",
  exact_match: "Khớp chính xác title/slug.",
  freshness: "Ưu tiên nội dung mới cập nhật.",
  fairness: "Điều chỉnh phân phối công bằng."
};

type SurfaceWeightsPanelProps = {
  category: AlgorithmSettingCategory;
  settings: AlgorithmSettingRow[];
  weightValidations: AlgorithmWeightValidation[];
  canUpdate: boolean;
  onRefresh: () => void;
};

export function SurfaceWeightsPanel({
  category,
  settings,
  weightValidations,
  canUpdate,
  onRefresh
}: SurfaceWeightsPanelProps) {
  const copy = SURFACE_COPY[category];
  const group = ALGORITHM_WEIGHT_GROUPS.find((g) => g.category === category);
  const validation = weightValidations.find((v) => v.groupId === group?.id);
  const weightSettings = settings.filter(
    (s) => s.category === category && s.key.includes(".weight.")
  );

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-white">{copy.title}</p>
            <p className="mt-1 text-sm text-zinc-400">{copy.description}</p>
          </div>
          <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-1 text-xs font-semibold text-cyan-200">
            Active
          </span>
        </div>

        {validation ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Tổng trọng số</span>
              <span
                className={
                  validation.isValid ? "font-bold text-emerald-300" : "font-bold text-amber-300"
                }
              >
                {validation.sum} / {validation.targetSum}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/5">
              <div
                className={`h-full rounded-full transition-all ${
                  validation.isValid ? "bg-emerald-400/70" : "bg-amber-400/70"
                }`}
                style={{
                  width: `${Math.min(100, Math.max(0, validation.sum * 100))}%`
                }}
              />
            </div>
            {!validation.isValid ? (
              <p className="text-xs text-amber-200/90">
                Tổng lệch mục tiêu — dùng &quot;Chuẩn hóa về 1.0&quot; hoặc chỉnh thủ công.
              </p>
            ) : null}
          </div>
        ) : null}

        {weightSettings.length > 0 ? (
          <details className="text-xs text-zinc-500">
            <summary className="cursor-pointer font-medium text-zinc-400">
              Giải thích trọng số
            </summary>
            <ul className="mt-2 space-y-1">
              {weightSettings.map((s) => {
                const keyPart = s.key.split(".").pop() ?? s.key;
                const hint = WEIGHT_HINTS[keyPart] ?? s.description ?? "—";
                return (
                  <li key={s.key}>
                    <code className="text-cyan-200/80">{keyPart}</code>: {hint}
                  </li>
                );
              })}
            </ul>
          </details>
        ) : null}
      </Card>

      <AlgorithmCategoryPanel
        canUpdate={canUpdate}
        categories={[category]}
        onRefresh={onRefresh}
        settings={settings}
        weightValidations={weightValidations}
      />
    </div>
  );
}
