"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { EmptyAnalyticsState } from "@/components/admin/taxonomy-analytics/EmptyAnalyticsState";
import { TaxonomyAnalyticsFilters } from "@/components/admin/taxonomy-analytics/TaxonomyAnalyticsFilters";
import { TaxonomyAnalyticsHeader } from "@/components/admin/taxonomy-analytics/TaxonomyAnalyticsHeader";
import { TaxonomyCompletionTable } from "@/components/admin/taxonomy-analytics/TaxonomyCompletionTable";
import { TaxonomyCreatorContributionTable } from "@/components/admin/taxonomy-analytics/TaxonomyCreatorContributionTable";
import { TaxonomyInsightSummary } from "@/components/admin/taxonomy-analytics/TaxonomyInsightSummary";
import { TaxonomyFairnessPanel } from "@/components/admin/taxonomy-analytics/TaxonomyFairnessPanel";
import { TaxonomyKpiGrid } from "@/components/admin/taxonomy-analytics/TaxonomyKpiGrid";
import { TaxonomyRecommendedActions } from "@/components/admin/taxonomy-analytics/TaxonomyRecommendedActions";
import { TaxonomyRevenueTable } from "@/components/admin/taxonomy-analytics/TaxonomyRevenueTable";
import { TaxonomySeoTable } from "@/components/admin/taxonomy-analytics/TaxonomySeoTable";
import { TaxonomySupplyDemandPanel } from "@/components/admin/taxonomy-analytics/TaxonomySupplyDemandPanel";
import { TaxonomySurfaceContributionTable } from "@/components/admin/taxonomy-analytics/TaxonomySurfaceContributionTable";
import { TaxonomyTopReadsTable } from "@/components/admin/taxonomy-analytics/TaxonomyTopReadsTable";
import { formatMetricNumber } from "@/components/admin/taxonomy-analytics/formatters";
import { TAXONOMY_TYPE_LABELS } from "@/lib/taxonomy/constants";
import { rebuildTaxonomyAnalyticsAction } from "@/lib/admin/taxonomy-analytics-actions";
import type { TaxonomyAnalyticsPageData } from "@/types/taxonomy-analytics";

type TaxonomyAnalyticsDashboardProps = {
  data: TaxonomyAnalyticsPageData;
  capabilities: {
    canExport: boolean;
    canRebuild: boolean;
    canManageSeo: boolean;
    canManageAlgorithm: boolean;
  };
};

function TablePanel({
  title,
  description,
  rows,
  render
}: {
  title: string;
  description: string;
  rows: unknown[];
  render: () => React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-[var(--surface)] p-4">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-zinc-400">{description}</p>
      {rows.length === 0 ? (
        <EmptyAnalyticsState
          description="Thử nới khoảng thời gian hoặc bỏ bớt filter để thấy dữ liệu đầy đủ hơn."
          title="Chưa có dữ liệu trong bộ lọc hiện tại."
        />
      ) : (
        <div className="mt-4 overflow-x-auto">{render()}</div>
      )}
    </section>
  );
}

export function TaxonomyAnalyticsDashboard({ data, capabilities }: TaxonomyAnalyticsDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [advanced, setAdvanced] = useState(false);
  const [rebuildMessage, setRebuildMessage] = useState<string | null>(null);
  const [readsPage, setReadsPage] = useState(1);
  const [completionPage, setCompletionPage] = useState(1);
  const [revenuePage, setRevenuePage] = useState(1);

  const [draft, setDraft] = useState(() => ({
    from: data.filters.from, to: data.filters.to, type: data.filters.type ?? "all", surface: data.filters.surface,
    term: data.filters.termId ?? "", creator: data.filters.creatorId ?? "", monetization: data.filters.monetizationType ?? "",
    completionMinStarts: String(data.filters.completionMinStarts),
    completionMinImpressions: String(data.filters.completionMinImpressions),
    completionMinStories: String(data.filters.completionMinStories)
  }));

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    const setOrDelete = (k: string, v: string) => (v && v !== "all" ? params.set(k, v) : params.delete(k));
    setOrDelete("from", draft.from); setOrDelete("to", draft.to); setOrDelete("type", draft.type); setOrDelete("surface", draft.surface);
    setOrDelete("term", draft.term); setOrDelete("creator", draft.creator); setOrDelete("monetization", draft.monetization);
    setOrDelete("completionMinStarts", draft.completionMinStarts); setOrDelete("completionMinImpressions", draft.completionMinImpressions); setOrDelete("completionMinStories", draft.completionMinStories);
    router.push(`/admin/taxonomy-analytics?${params.toString()}`);
  };

  const resetFilters = () => router.push("/admin/taxonomy-analytics");

  const chips = useMemo(() => {
    const out: string[] = [];
    if (data.filters.type) out.push(`Nhóm: ${TAXONOMY_TYPE_LABELS[data.filters.type as keyof typeof TAXONOMY_TYPE_LABELS] ?? data.filters.type}`);
    if (data.filters.termId) out.push("Đang lọc theo term");
    if (data.filters.creatorId) out.push("Đang lọc theo creator");
    if (data.filters.monetizationType) out.push("Đang lọc theo monetization");
    out.push(`Surface: ${data.filters.surface}`);
    return out;
  }, [data.filters]);

  const onRebuild = () => {
    if (!capabilities.canRebuild) return;
    startTransition(async () => {
      setRebuildMessage(null);
      const result = await rebuildTaxonomyAnalyticsAction({ from: data.filters.from, to: data.filters.to });
      setRebuildMessage(result.ok ? "Làm mới aggregate hoàn tất." : result.error);
      if (result.ok) router.refresh();
    });
  };

  const onOpenLogs = async () => {
    const params = new URLSearchParams(searchParams.toString());
    const response = await fetch(`/api/admin/taxonomy-analytics/logs?${params.toString()}`);
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    setRebuildMessage(payload?.message ?? "Đã mở nhật ký aggregate.");
  };
  const onExportCsv = () => {
    const params = new URLSearchParams(searchParams.toString());
    window.location.href = `/api/admin/taxonomy-analytics/export?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <TaxonomyAnalyticsHeader
        canExport={capabilities.canExport}
        canManageAlgorithm={capabilities.canManageAlgorithm}
        canRebuild={capabilities.canRebuild}
        message={rebuildMessage}
        onExportCsv={onExportCsv}
        onOpenLogs={onOpenLogs}
        onRebuild={onRebuild}
        pending={pending}
      />
      <TaxonomyAnalyticsFilters
        advanced={advanced}
        canRebuild={capabilities.canRebuild}
        chips={chips}
        data={data}
        draft={draft}
        onApply={applyFilters}
        onRefresh={onRebuild}
        onReset={resetFilters}
        pending={pending}
        setAdvanced={setAdvanced}
        setDraft={(updater) => setDraft((prev) => updater(prev))}
      />
      <TaxonomyKpiGrid summary={data.summary} />
      <TaxonomyInsightSummary insights={data.insights} />

      <TablePanel
        description="Nhận diện taxonomy tạo nhiều lượt bắt đầu đọc."
        render={() => (
          <TaxonomyTopReadsTable
            onPageChange={setReadsPage}
            page={readsPage}
            rows={data.topByReads}
          />
        )}
        rows={data.topByReads}
        title="Top taxonomy by reads"
      />

      <TablePanel
        description="Chỉ tính term đạt ngưỡng mẫu tối thiểu do admin đặt."
        render={() => (
          <TaxonomyCompletionTable
            onPageChange={setCompletionPage}
            page={completionPage}
            rows={data.topByCompletion}
          />
        )}
        rows={data.topByCompletion}
        title="Top taxonomy by completion rate"
      />

      <TablePanel
        description="Xếp hạng taxonomy theo doanh thu coin trong kỳ."
        render={() => (
          <TaxonomyRevenueTable
            rows={data.topByRevenue}
            page={revenuePage}
            onPageChange={setRevenuePage}
          />
        )}
        rows={data.topByRevenue}
        title="Top taxonomy by revenue"
      />

      <TaxonomySupplyDemandPanel
        highSupplyLowDemand={data.highSupplyLowDemand}
        lowSupplyHighRetention={data.lowSupplyHighRetention}
      />

      <section className="rounded-xl border border-white/10 bg-[var(--surface)] p-4">
        <h2 className="text-base font-semibold">Taxonomy bị report sai tag</h2>
        {data.topReported.length === 0 ? (
          <EmptyAnalyticsState
            description="Không phát hiện taxonomy có report sai tag trong bộ lọc hiện tại."
            title="Không có report sai tag đáng chú ý trong kỳ."
          />
        ) : (
          <div className="mt-3 space-y-2">
            {data.topReported.slice(0, 8).map((row) => (
              <div
                key={row.termId}
                className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm"
              >
                <span className="font-medium">{row.termName}</span> ·{" "}
                {formatMetricNumber(row.reportsWrongTag)} report
              </div>
            ))}
          </div>
        )}
      </section>

      <TaxonomySeoTable rows={data.seoPages} canManageSeo={capabilities.canManageSeo} />
      <TaxonomySurfaceContributionTable rows={data.surfaceContribution} />
      <TaxonomyCreatorContributionTable rows={data.creatorContribution} />
      <TaxonomyFairnessPanel fairness={data.fairness} />
      <TaxonomyRecommendedActions actions={data.recommendedActions} />

      <section className="rounded-xl border border-white/10 bg-[var(--surface)] p-4">
        <h2 className="text-base font-semibold">Ghi chú dữ liệu</h2>
        <ul className="mt-3 space-y-2 text-sm text-zinc-400">
          <li>• Dashboard ưu tiên dữ liệu aggregate từ `taxonomy_daily_metrics`, `taxonomy_story_metrics`, `taxonomy_creator_metrics`.</li>
          <li>• Khi chưa đủ volume, một số chỉ số sẽ hiển thị `—` thay vì 0 để tránh gây hiểu nhầm vận hành.</li>
          <li>• Các cảnh báo concentration/recommended actions chỉ là gợi ý vận hành, không tự động áp phạt creator.</li>
        </ul>
      </section>
    </div>
  );
}
