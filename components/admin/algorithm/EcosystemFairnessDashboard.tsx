"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Card } from "@/components/ui";
import {
  ecosystemBoostStoryAction,
  ecosystemReduceExposureAction
} from "@/lib/admin/ecosystem-actions";
import { getProfileUrlOrFallback } from "@/lib/profile/profile-url";
import type { EcosystemDashboardData } from "@/types/ecosystem-dashboard";
import {
  ECOSYSTEM_SURFACE_FILTERS,
  ECOSYSTEM_SURFACE_LABELS,
  ECOSYSTEM_TIME_WINDOWS,
  ECOSYSTEM_WINDOW_LABELS
} from "@/types/ecosystem-dashboard";

type EcosystemFairnessDashboardProps = {
  data: EcosystemDashboardData;
};

export function EcosystemFairnessDashboard({ data }: EcosystemFairnessDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const setFilters = (surface: string, window: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("surface", surface);
    params.set("window", window);
    router.push(`/admin/algorithm/ecosystem?${params.toString()}`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {ECOSYSTEM_SURFACE_FILTERS.map((surface) => (
            <FilterChip
              active={data.surface === surface}
              key={surface}
              label={ECOSYSTEM_SURFACE_LABELS[surface]}
              onClick={() => setFilters(surface, data.timeWindow)}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {ECOSYSTEM_TIME_WINDOWS.map((window) => (
            <FilterChip
              active={data.timeWindow === window}
              key={window}
              label={ECOSYSTEM_WINDOW_LABELS[window]}
              onClick={() => setFilters(data.surface, window)}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <ActionLink href="/admin/algorithm">Algorithm Settings</ActionLink>
        <ActionLink href="/admin/algorithm/fairness#fairness-settings">
          Fairness Settings
        </ActionLink>
        <ActionLink href="/admin/algorithm/cold-start">Cold Start</ActionLink>
        <ActionLink href="/admin/algorithm/fairness">Adjustment log (legacy)</ActionLink>
      </div>

      {data.error ? (
        <Card className="border-amber-400/30 bg-amber-500/5 text-amber-100">{data.error}</Card>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng impressions" value={data.overview.totalImpressions.toLocaleString("vi-VN")} />
        <StatCard label="Tác giả có impressions" value={String(data.overview.authorsWithImpressions)} />
        <StatCard label="Truyện có impressions" value={String(data.overview.storiesWithImpressions)} />
        <StatCard
          alert={data.overview.top1AuthorSharePercent > data.thresholds.top1AuthorPercent}
          label="Top 1% tác giả"
          value={`${data.overview.top1AuthorSharePercent.toFixed(1)}%`}
        />
        <StatCard
          alert={data.overview.top10StorySharePercent > data.thresholds.top10StoryPercent}
          label="Top 10% truyện"
          value={`${data.overview.top10StorySharePercent.toFixed(1)}%`}
        />
        <StatCard
          alert={data.overview.newAuthorExposureShare < data.thresholds.minNewAuthorPercent}
          label="New author exposure"
          value={`${data.overview.newAuthorExposureShare.toFixed(1)}%`}
        />
        <StatCard
          alert={data.overview.longTailExposureShare < data.thresholds.minLongTailPercent}
          label="Long-tail exposure"
          value={`${data.overview.longTailExposureShare.toFixed(1)}%`}
        />
        <StatCard
          label="Under-exposed chất lượng cao"
          value={String(data.overview.underExposedQualityCount)}
        />
      </section>

      {data.warnings.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-black text-white">Cảnh báo concentration</h2>
          {data.warnings.map((warning) => (
            <Card
              className={
                warning.level === "critical"
                  ? "border-red-400/30 bg-red-500/5 text-red-100"
                  : "border-amber-400/30 bg-amber-500/5 text-amber-100"
              }
              key={warning.id}
            >
              {warning.message}
            </Card>
          ))}
        </section>
      ) : (
        <Card className="border-emerald-400/30 bg-emerald-500/5 text-emerald-100">
          Hệ sinh thái trong ngưỡng an toàn cho {data.surfaceLabel} · {data.windowLabel}.
        </Card>
      )}

      <TableSection title="Top tác giả theo exposure">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase text-zinc-500">
              <th className="px-3 py-2">Tác giả</th>
              <th className="px-3 py-2">Impressions</th>
              <th className="px-3 py-2">Share</th>
              <th className="px-3 py-2">Truyện</th>
              <th className="px-3 py-2">Revenue</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.topAuthors.map((row) => (
              <tr className="border-b border-white/5" key={row.userId}>
                <td className="px-3 py-2">
                  <Link className="font-medium text-cyan-200 hover:underline" href={row.profileUrl}>
                    {row.displayName}
                  </Link>
                  {row.overCap ? (
                    <span className="ml-2 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-200">
                      Over cap
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-zinc-300">{row.impressions}</td>
                <td className="px-3 py-2 text-zinc-300">{row.sharePercent.toFixed(1)}%</td>
                <td className="px-3 py-2 text-zinc-400">{row.storyCount}</td>
                <td className="px-3 py-2 text-zinc-400">{row.revenueCoin.toFixed(0)}</td>
                <td className="px-3 py-2">
                  {row.overCap ? (
                    <MiniButton
                      disabled={pending}
                      label="Giảm hiển thị"
                      onClick={() =>
                        startTransition(async () => {
                          await ecosystemReduceExposureAction({
                            itemType: "author",
                            itemId: row.userId,
                            authorUserId: row.userId,
                            surface: data.surface === "all" ? "reels" : data.surface,
                            sharePercent: row.sharePercent
                          });
                          router.refresh();
                        })
                      }
                    />
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableSection>

      <TableSection title="Top truyện theo exposure">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase text-zinc-500">
              <th className="px-3 py-2">Truyện</th>
              <th className="px-3 py-2">Tác giả</th>
              <th className="px-3 py-2">Imp.</th>
              <th className="px-3 py-2">Share</th>
              <th className="px-3 py-2">Completion</th>
              <th className="px-3 py-2">Report</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.topStories.map((row) => (
              <tr className="border-b border-white/5" key={row.storyId}>
                <td className="max-w-[180px] truncate px-3 py-2">
                  <Link className="text-white hover:underline" href={`/stories/${row.slug}`}>
                    {row.title}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <Link
                    className="text-cyan-200 hover:underline"
                    href={getProfileUrlOrFallback(row.authorUsername)}
                  >
                    {row.authorDisplayName}
                  </Link>
                </td>
                <td className="px-3 py-2 text-zinc-300">{row.impressions}</td>
                <td className="px-3 py-2 text-zinc-300">{row.sharePercent.toFixed(1)}%</td>
                <td className="px-3 py-2 text-zinc-400">{(row.completionRate * 100).toFixed(0)}%</td>
                <td className="px-3 py-2 text-zinc-400">{(row.reportRate * 100).toFixed(1)}%</td>
                <td className="px-3 py-2">
                  {row.overCap ? (
                    <MiniButton
                      disabled={pending}
                      label="Giảm"
                      onClick={() =>
                        startTransition(async () => {
                          await ecosystemReduceExposureAction({
                            itemType: "story",
                            itemId: row.storyId,
                            storyId: row.storyId,
                            surface: data.surface === "all" ? "reels" : data.surface,
                            sharePercent: row.sharePercent
                          });
                          router.refresh();
                        })
                      }
                    />
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableSection>

      <TableSection title="Under-exposed nhưng chất lượng cao">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase text-zinc-500">
              <th className="px-3 py-2">Truyện</th>
              <th className="px-3 py-2">Tác giả</th>
              <th className="px-3 py-2">Imp.</th>
              <th className="px-3 py-2">Completion</th>
              <th className="px-3 py-2">Quality</th>
              <th className="px-3 py-2">Đề xuất</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.underExposed.map((row) => (
              <tr className="border-b border-white/5" key={row.storyId}>
                <td className="max-w-[160px] truncate px-3 py-2 text-white">{row.title}</td>
                <td className="px-3 py-2">
                  <Link
                    className="text-cyan-200 hover:underline"
                    href={getProfileUrlOrFallback(row.authorUsername)}
                  >
                    {row.authorDisplayName}
                  </Link>
                </td>
                <td className="px-3 py-2 text-zinc-300">{row.impressions}</td>
                <td className="px-3 py-2 text-zinc-400">{(row.completionRate * 100).toFixed(0)}%</td>
                <td className="px-3 py-2 text-zinc-400">{row.qualityScore.toFixed(2)}</td>
                <td className="px-3 py-2 text-xs text-zinc-500">{row.recommendedAction}</td>
                <td className="px-3 py-2">
                  <MiniButton
                    disabled={pending}
                    label="Boost test"
                    onClick={() =>
                      startTransition(async () => {
                        await ecosystemBoostStoryAction(row.storyId);
                        router.refresh();
                      })
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableSection>

      <TableSection title="Tác giả mới cần exposure">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase text-zinc-500">
              <th className="px-3 py-2">Tác giả</th>
              <th className="px-3 py-2">Truyện</th>
              <th className="px-3 py-2">Impressions</th>
              <th className="px-3 py-2">Cold start</th>
            </tr>
          </thead>
          <tbody>
            {data.newAuthors.map((row) => (
              <tr className="border-b border-white/5" key={row.userId}>
                <td className="px-3 py-2">
                  <Link className="text-cyan-200 hover:underline" href={row.profileUrl}>
                    {row.displayName}
                  </Link>
                </td>
                <td className="px-3 py-2 text-zinc-300">{row.publishedStories}</td>
                <td className="px-3 py-2 text-zinc-300">{row.impressionsReceived}</td>
                <td className="px-3 py-2 text-zinc-400">{row.coldStartStatus ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableSection>

      <TableSection title="Phân bổ theo thể loại">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase text-zinc-500">
              <th className="px-3 py-2">Thể loại</th>
              <th className="px-3 py-2">Imp. %</th>
              <th className="px-3 py-2">Reads %</th>
              <th className="px-3 py-2">Completion</th>
            </tr>
          </thead>
          <tbody>
            {data.genres.map((row) => (
              <tr className="border-b border-white/5" key={row.genreId}>
                <td className="px-3 py-2">
                  <Link className="text-white hover:underline" href={`/the-loai/${row.genreSlug}`}>
                    {row.genreName}
                  </Link>
                  {row.skewWarning ? (
                    <span className="ml-2 text-[10px] font-bold text-amber-300">Lệch</span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-zinc-300">{row.impressionSharePercent.toFixed(1)}%</td>
                <td className="px-3 py-2 text-zinc-300">{row.readSharePercent.toFixed(1)}%</td>
                <td className="px-3 py-2 text-zinc-400">{(row.completionRate * 100).toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableSection>

      <TableSection title="Adjustment log gần đây">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase text-zinc-500">
              <th className="px-3 py-2">Loại</th>
              <th className="px-3 py-2">Surface</th>
              <th className="px-3 py-2">Lý do</th>
              <th className="px-3 py-2">Score</th>
              <th className="px-3 py-2">Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {data.recentAdjustments.map((row) => (
              <tr className="border-b border-white/5" key={row.id}>
                <td className="px-3 py-2 text-zinc-300">{row.adjustmentType}</td>
                <td className="px-3 py-2 text-zinc-400">{row.surface}</td>
                <td className="max-w-xs truncate px-3 py-2 text-zinc-500">{row.reason ?? "—"}</td>
                <td className="px-3 py-2 text-zinc-400">
                  {row.oldScore.toFixed(2)} → {row.newScore.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-zinc-500">
                  {new Date(row.createdAt).toLocaleString("vi-VN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableSection>
    </div>
  );
}

function StatCard({
  label,
  value,
  alert
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <Card className={`space-y-1 ${alert ? "border-amber-400/30 bg-amber-500/5" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="text-2xl font-black text-white">{value}</p>
    </Card>
  );
}

function TableSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-black text-white">{title}</h2>
      <Card className="overflow-x-auto">{children}</Card>
    </section>
  );
}

function FilterChip({
  label,
  active,
  onClick
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`tap-highlight rounded-full border px-3 py-1.5 text-xs font-bold transition ${
        active
          ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
          : "border-white/10 text-zinc-400 hover:border-white/20"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function ActionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:border-white/20"
      href={href}
    >
      {children}
    </Link>
  );
}

function MiniButton({
  label,
  onClick,
  disabled
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="rounded-full border border-white/10 px-2 py-1 text-[11px] font-bold text-zinc-300 hover:border-white/20 disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
