"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui";
import { explainRecommendationAction } from "@/lib/admin/fair-distribution-actions";
import type { ExplainRecommendationResult, FairDistributionSurface } from "@/types/fair-distribution";

const SURFACES: { id: FairDistributionSurface; label: string }[] = [
  { id: "reels", label: "Reels" },
  { id: "discover", label: "Khám phá" },
  { id: "search", label: "Tìm kiếm" },
  { id: "catalog", label: "Catalog" }
];

export function AlgorithmExposureAuditTab() {
  const [storyId, setStoryId] = useState("");
  const [surface, setSurface] = useState<FairDistributionSurface>("reels");
  const [result, setResult] = useState<ExplainRecommendationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = storyId.trim();
    if (!trimmed) return;

    setError(null);
    startTransition(async () => {
      const response = await explainRecommendationAction({ storyId: trimmed, surface });
      if (!response.success) {
        setError(response.error);
        setResult(null);
        return;
      }
      setResult(response.result);
    });
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-5">
        <div>
          <h2 className="text-base font-bold text-white">Exposure audit</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Xem score breakdown, exposure 24h/7d và lý do boost/giảm hiển thị.
          </p>
        </div>

        <form className="flex flex-wrap items-end gap-3" onSubmit={handleSubmit}>
          <label className="min-w-[240px] flex-1 space-y-1 text-sm">
            <span className="text-zinc-400">Story ID</span>
            <input
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100"
              onChange={(e) => setStoryId(e.target.value)}
              placeholder="UUID truyện"
              value={storyId}
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-zinc-400">Surface</span>
            <select
              className="block rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-zinc-100"
              onChange={(e) => setSurface(e.target.value as FairDistributionSurface)}
              value={surface}
            >
              {SURFACES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <button
            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-cyan-300 disabled:opacity-60"
            disabled={pending}
            type="submit"
          >
            {pending ? "Đang tải..." : "Phân tích"}
          </button>
        </form>

        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </Card>

      {result?.breakdown ? (
        <Card className="space-y-4 p-5">
          <h3 className="text-sm font-bold text-white">Score breakdown</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Quality", result.breakdown.qualityScore],
              ["Freshness", result.breakdown.freshnessScore],
              ["Engagement", result.breakdown.engagementScore],
              ["Cold start", result.breakdown.coldStartScore],
              ["Diversity", result.breakdown.diversityScore],
              ["Taxonomy fairness", result.breakdown.taxonomyFairnessScore],
              ["Penalty", result.breakdown.penaltyScore],
              ["Final", result.breakdown.finalScore]
            ].map(([label, value]) => (
              <div
                className="rounded-lg border border-white/10 bg-zinc-950/50 px-3 py-2"
                key={String(label)}
              >
                <p className="text-xs text-zinc-500">{label}</p>
                <p className="text-lg font-bold text-cyan-200">
                  {Number(value).toFixed(3)}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-zinc-300">
            <span>
              Exposure 24h: <strong>{result.exposure24h}</strong>
            </span>
            <span>
              Exposure 7d: <strong>{result.exposure7d}</strong>
            </span>
          </div>

          {result.breakdown.reasons.length > 0 ? (
            <ul className="list-inside list-disc text-sm text-zinc-400">
              {result.breakdown.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}

          {result.recentLogs.length > 0 ? (
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Log gần đây
              </h4>
              <ul className="space-y-1 text-xs text-zinc-400">
                {result.recentLogs.map((log, i) => (
                  <li key={`${log.shownAt}-${i}`}>
                    {new Date(log.shownAt).toLocaleString("vi-VN")} · {log.surface} · score{" "}
                    {log.score?.toFixed(3) ?? "—"}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
