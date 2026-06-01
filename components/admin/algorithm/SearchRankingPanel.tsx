"use client";

import { useMemo, useState } from "react";
import { AlgorithmCategoryPanel } from "@/components/admin/algorithm/AlgorithmCategoryPanel";
import { Card } from "@/components/ui";
import type {
  AlgorithmSettingRow,
  AlgorithmWeightValidation
} from "@/types/algorithm-settings";

type SearchRankingPanelProps = {
  settings: AlgorithmSettingRow[];
  weightValidations: AlgorithmWeightValidation[];
  canUpdate: boolean;
  onRefresh: () => void;
};

function weightOf(settings: AlgorithmSettingRow[], key: string) {
  const v = settings.find((s) => s.key === key)?.value;
  return typeof v === "number" ? v : 0;
}

export function SearchRankingPanel({
  settings,
  weightValidations,
  canUpdate,
  onRefresh
}: SearchRankingPanelProps) {
  const [keyword, setKeyword] = useState("truyện ngôn tình");

  const preview = useMemo(() => {
    const wText = weightOf(settings, "search.weight.text_relevance");
    const wQuality = weightOf(settings, "search.weight.quality");
    const wExact = weightOf(settings, "search.weight.exact_match");
    const wFresh = weightOf(settings, "search.weight.freshness");
    const wFair = weightOf(settings, "search.weight.fairness");

    const mockItems = [
      {
        title: `${keyword} — Hoàn thành`,
        scores: {
          text: 0.92 * wText,
          quality: 0.78 * wQuality,
          exact: keyword.length > 3 ? 0.7 * wExact : 0.2 * wExact,
          fresh: 0.4 * wFresh,
          fair: 0.85 * wFair
        }
      },
      {
        title: "Tác giả @demo — truyện liên quan",
        scores: {
          text: 0.55 * wText,
          quality: 0.82 * wQuality,
          exact: 0.1 * wExact,
          fresh: 0.9 * wFresh,
          fair: 0.7 * wFair
        }
      },
      {
        title: "Kết quả long-tail",
        scores: {
          text: 0.48 * wText,
          quality: 0.65 * wQuality,
          exact: 0,
          fresh: 0.55 * wFresh,
          fair: 0.95 * wFair
        }
      }
    ];

    return mockItems
      .map((item) => ({
        ...item,
        total: Object.values(item.scores).reduce((a, b) => a + b, 0)
      }))
      .sort((a, b) => b.total - a.total);
  }, [keyword, settings]);

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <p className="text-sm font-bold text-white">Preview truy vấn mẫu</p>
        <p className="text-xs text-zinc-500">
          Mock score breakdown — thay bằng API search khi backend sẵn sàng.
        </p>
        <input
          className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Nhập từ khóa..."
          value={keyword}
        />
        <ol className="space-y-2">
          {preview.map((row, i) => (
            <li
              className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm"
              key={row.title}
            >
              <p className="font-medium text-zinc-100">
                #{i + 1} {row.title}
              </p>
              <p className="text-xs text-cyan-200/90">
                Tổng ≈ {row.total.toFixed(3)} (text + quality + exact + fresh + fair)
              </p>
            </li>
          ))}
        </ol>
      </Card>

      <AlgorithmCategoryPanel
        canUpdate={canUpdate}
        categories={["search"]}
        onRefresh={onRefresh}
        settings={settings}
        weightValidations={weightValidations}
      />
    </div>
  );
}
