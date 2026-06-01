import Link from "next/link";
import { Card } from "@/components/ui";
import { getProfileUrlOrFallback } from "@/lib/profile/profile-url";
import type { AlgorithmExplanation, AlgorithmItemAuditData } from "@/types/algorithm-explanation";

type AlgorithmItemAuditPanelProps = {
  data: AlgorithmItemAuditData;
  backHref?: string;
};

const SEVERITY_STYLES: Record<string, string> = {
  info: "border-white/10 bg-white/[0.03] text-zinc-300",
  success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
  warning: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  critical: "border-rose-400/30 bg-rose-400/10 text-rose-100"
};

function ExplanationList({
  title,
  items
}: {
  title: string;
  items: AlgorithmExplanation[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            className={`rounded-xl border px-3 py-2 text-sm ${SEVERITY_STYLES[item.severity] ?? SEVERITY_STYLES.info}`}
            key={`${item.title}-${index}`}
          >
            <p className="font-semibold">{item.title}</p>
            <p className="mt-1 leading-6 opacity-90">{item.message}</p>
            <p className="mt-1 text-xs opacity-60">{item.explanationType}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function MetricGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2" key={item.label}>
          <p className="text-xs text-zinc-500">{item.label}</p>
          <p className="font-mono text-sm font-semibold text-zinc-100">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export function AlgorithmItemAuditPanel({ data, backHref = "/admin/algorithm/audit" }: AlgorithmItemAuditPanelProps) {
  if (data.error) {
    return (
      <Card className="p-6 text-sm text-red-200">
        <p>{data.error}</p>
        <Link className="mt-4 inline-block text-cyan-300 hover:underline" href={backHref}>
          ← Quay lại audit
        </Link>
      </Card>
    );
  }

  const { scores, exposure, actions, fairness, coldStart, safety } = data;
  const authorUrl = data.authorUsername
    ? getProfileUrlOrFallback(data.authorUsername)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="page-kicker">
            Algorithm audit · {data.itemType}
          </p>
          <h1 className="page-title">{data.title}</h1>
          <p className="page-copy font-mono text-xs">{data.itemId}</p>
          {authorUrl ? (
            <Link className="mt-2 inline-block text-sm text-cyan-300 hover:underline" href={authorUrl}>
              {data.authorDisplayName ?? data.authorUsername}
            </Link>
          ) : null}
        </div>
        <Link className="text-sm text-zinc-400 hover:text-zinc-200" href={backHref}>
          ← Quay lại
        </Link>
      </div>

      <ExplanationList items={data.adminExplanations} title="Giải thích thuật toán" />

      <Card className="space-y-3 p-4">
        <h3 className="text-sm font-bold text-white">Score breakdown</h3>
        <MetricGrid
          items={[
            { label: "Quality", value: scores.qualityScore.toFixed(3) },
            { label: "Freshness", value: scores.freshnessScore.toFixed(3) },
            { label: "Discovery", value: scores.discoveryScore.toFixed(3) },
            { label: "Fairness", value: scores.fairnessScore.toFixed(3) },
            { label: "Safety", value: scores.safetyScore.toFixed(3) },
            { label: "Spam penalty", value: scores.spamPenalty.toFixed(3) },
            { label: "Final Discover", value: scores.finalDiscoverScore.toFixed(3) },
            { label: "Final Reels", value: scores.finalReelsScore.toFixed(3) },
            { label: "Final Search", value: scores.finalSearchBoostScore.toFixed(3) },
            { label: "Final Ranking", value: scores.finalRankingScore.toFixed(3) },
            {
              label: "Snapshot",
              value: scores.snapshotAt
                ? new Date(scores.snapshotAt).toLocaleString("vi-VN")
                : "—"
            }
          ]}
        />
      </Card>

      <Card className="space-y-3 p-4">
        <h3 className="text-sm font-bold text-white">Exposure</h3>
        <MetricGrid
          items={[
            { label: "Impressions 1d", value: String(exposure.impressions1d) },
            { label: "Impressions 7d", value: String(exposure.impressions7d) },
            { label: "Impressions 30d", value: String(exposure.impressions30d) }
          ]}
        />
        {Object.keys(exposure.bySurface).length > 0 ? (
          <div>
            <p className="mb-2 text-xs text-zinc-500">Theo surface (7d)</p>
            <MetricGrid
              items={Object.entries(exposure.bySurface).map(([k, v]) => ({
                label: k,
                value: String(v)
              }))}
            />
          </div>
        ) : null}
        {Object.keys(exposure.byPool).length > 0 ? (
          <div>
            <p className="mb-2 text-xs text-zinc-500">Candidate pools (7d)</p>
            <MetricGrid
              items={Object.entries(exposure.byPool).map(([k, v]) => ({
                label: k,
                value: String(v)
              }))}
            />
          </div>
        ) : null}
      </Card>

      <Card className="space-y-3 p-4">
        <h3 className="text-sm font-bold text-white">Hành vi độc giả (7d)</h3>
        <MetricGrid
          items={[
            { label: "Clicks", value: String(actions.clicks) },
            { label: "Read start", value: String(actions.readStart) },
            { label: "Read complete", value: String(actions.readComplete) },
            { label: "Next chapter", value: String(actions.nextChapter) },
            { label: "Saves", value: String(actions.saves) },
            { label: "Follows", value: String(actions.follows) },
            { label: "Reports", value: String(actions.reports) },
            { label: "Hides", value: String(actions.hides) }
          ]}
        />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3 p-4">
          <h3 className="text-sm font-bold text-white">Fairness</h3>
          <MetricGrid
            items={[
              {
                label: "Author exposure share",
                value: `${fairness.authorSharePercent.toFixed(1)}%`
              },
              {
                label: "Story exposure share",
                value: `${fairness.storySharePercent.toFixed(1)}%`
              },
              {
                label: "Author over cap",
                value: fairness.authorOverCap ? "Có" : "Không"
              },
              {
                label: "Story over cap",
                value: fairness.storyOverCap ? "Có" : "Không"
              },
              {
                label: "Penalty applied",
                value: fairness.penaltyApplied ? "Có" : "Không"
              }
            ]}
          />
        </Card>

        <Card className="space-y-3 p-4">
          <h3 className="text-sm font-bold text-white">Cold start & Safety</h3>
          <MetricGrid
            items={[
              { label: "Cold start status", value: coldStart.status ?? "—" },
              {
                label: "Delivered / target",
                value: `${coldStart.deliveredImpressions}/${coldStart.targetImpressions}`
              },
              { label: "Report rate", value: `${(safety.reportRate * 100).toFixed(2)}%` },
              { label: "Hide rate", value: `${(safety.hideRate * 100).toFixed(2)}%` },
              { label: "Completion rate", value: `${(safety.completionRate * 100).toFixed(1)}%` },
              { label: "Next chapter rate", value: `${(safety.nextChapterRate * 100).toFixed(1)}%` }
            ]}
          />
        </Card>
      </div>

      {data.scoreHistory.length > 0 ? (
        <Card className="space-y-3 p-4">
          <h3 className="text-sm font-bold text-white">Score snapshots</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-zinc-500">
                  <th className="py-2 pr-4">Thời gian</th>
                  <th className="py-2 pr-4">Discover</th>
                  <th className="py-2">Reels</th>
                </tr>
              </thead>
              <tbody>
                {data.scoreHistory.map((row) => (
                  <tr className="border-t border-white/5 text-zinc-300" key={row.snapshotAt}>
                    <td className="py-2 pr-4">
                      {new Date(row.snapshotAt).toLocaleString("vi-VN")}
                    </td>
                    <td className="py-2 pr-4 font-mono">{row.finalDiscover.toFixed(3)}</td>
                    <td className="py-2 font-mono">{row.finalReels.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {data.adjustmentLogs.length > 0 ? (
        <Card className="space-y-3 p-4">
          <h3 className="text-sm font-bold text-white">Fairness adjustment logs</h3>
          <div className="space-y-2">
            {data.adjustmentLogs.map((log) => (
              <div className="rounded-lg border border-white/10 px-3 py-2 text-xs" key={log.id}>
                <p className="font-mono text-cyan-200">
                  {log.adjustmentType} · {log.surface}
                </p>
                <p className="mt-1 text-zinc-400">
                  {log.oldScore.toFixed(3)} → {log.newScore.toFixed(3)} ·{" "}
                  {new Date(log.createdAt).toLocaleString("vi-VN")}
                </p>
                {log.reason ? <p className="mt-1 text-zinc-500">{log.reason}</p> : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <ExplanationList items={data.creatorExplanations} title="Preview thông điệp Studio (creator)" />
    </div>
  );
}
