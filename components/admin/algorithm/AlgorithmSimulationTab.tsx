"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui";
import { runFairDistributionSimulationAction } from "@/lib/admin/fair-distribution-actions";
import type { SimulationResult } from "@/types/fair-distribution";
import type { FeedSurface } from "@/types/feed-mixer";

const SURFACES: { id: FeedSurface; label: string }[] = [
  { id: "reels", label: "Reels" },
  { id: "discover", label: "Khám phá" },
  { id: "search", label: "Tìm kiếm" }
];

export function AlgorithmSimulationTab() {
  const [surface, setSurface] = useState<FeedSurface>("reels");
  const [limit, setLimit] = useState(25);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleRun() {
    setError(null);
    startTransition(async () => {
      const response = await runFairDistributionSimulationAction({ surface, limit });
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
          <h2 className="text-base font-bold text-white">Mô phỏng ranking</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Chạy thử candidate ranking với cấu hình hiện tại. Không ghi exposure thật.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-sm">
            <span className="text-zinc-400">Surface</span>
            <select
              className="block rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-zinc-100"
              onChange={(e) => setSurface(e.target.value as FeedSurface)}
              value={surface}
            >
              {SURFACES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-zinc-400">Số lượng</span>
            <input
              className="block w-24 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-zinc-100"
              max={50}
              min={5}
              onChange={(e) => setLimit(Number(e.target.value))}
              type="number"
              value={limit}
            />
          </label>

          <button
            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-cyan-300 disabled:opacity-60"
            disabled={pending}
            onClick={handleRun}
            type="button"
          >
            {pending ? "Đang chạy..." : "Chạy simulation"}
          </button>
        </div>

        {error ? (
          <p className="text-sm text-red-300">{error}</p>
        ) : null}
      </Card>

      {result ? (
        <Card className="space-y-4 p-5">
          <div className="flex flex-wrap gap-4 text-sm text-zinc-300">
            <span>
              Tác giả unique: <strong>{result.diversitySummary.uniqueAuthors}</strong>
            </span>
            <span>
              Thể loại unique: <strong>{result.diversitySummary.uniqueGenres}</strong>
            </span>
            <span>
              Top author share:{" "}
              <strong>{result.diversitySummary.topAuthorSharePercent.toFixed(1)}%</strong>
            </span>
            <span>
              Top genre share:{" "}
              <strong>{result.diversitySummary.topGenreSharePercent.toFixed(1)}%</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Story</th>
                  <th className="py-2 pr-3">Genre</th>
                  <th className="py-2 pr-3">Score</th>
                  <th className="py-2">Lý do</th>
                </tr>
              </thead>
              <tbody>
                {result.candidates.map((item, index) => (
                  <tr className="border-b border-white/5" key={`${item.storyId}-${index}`}>
                    <td className="py-2 pr-3 text-zinc-500">{index + 1}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-zinc-200">
                      {item.storyId.slice(0, 8)}…
                    </td>
                    <td className="py-2 pr-3 text-zinc-300">{item.genreName ?? "—"}</td>
                    <td className="py-2 pr-3 font-bold text-cyan-200">
                      {item.finalScore.toFixed(3)}
                    </td>
                    <td className="py-2 text-xs text-zinc-400">
                      {item.breakdown.reasons.slice(0, 3).join(" · ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
