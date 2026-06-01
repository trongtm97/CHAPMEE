"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { AlgorithmHeader } from "@/components/admin/algorithm/AlgorithmHeader";
import { AlgorithmTabs } from "@/components/admin/algorithm/AlgorithmTabs";
import { AlgorithmOverviewTab } from "@/components/admin/algorithm/AlgorithmOverviewTab";
import { loadAlgorithmSettingsPageData } from "@/lib/admin/algorithm-settings-data";
import {
  ALGORITHM_CONTROL_TABS,
  type AlgorithmControlCenterData,
  type AlgorithmControlTabId,
  type AlgorithmSettingCategory
} from "@/types/algorithm-settings";
import { useLatestRequestGuard } from "@/hooks/useLatestRequestGuard";

type AdminAlgorithmControlCenterPageProps = {
  initialTab: AlgorithmControlTabId;
  initialData: AlgorithmControlCenterData;
  basePath?: string;
};

const SURFACE_TABS: AlgorithmSettingCategory[] = ["reels", "discover"];

function PanelSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-24 animate-pulse rounded-lg bg-white/10" />
        <div className="h-24 animate-pulse rounded-lg bg-white/10" />
      </div>
    </div>
  );
}

const SurfaceWeightsPanel = dynamic(
  () =>
    import("@/components/admin/algorithm/SurfaceWeightsPanel").then(
      (mod) => mod.SurfaceWeightsPanel
    ),
  { loading: () => <PanelSkeleton /> }
);
const SearchRankingPanel = dynamic(
  () =>
    import("@/components/admin/algorithm/SearchRankingPanel").then(
      (mod) => mod.SearchRankingPanel
    ),
  { loading: () => <PanelSkeleton /> }
);
const RankingRulesPanel = dynamic(
  () =>
    import("@/components/admin/algorithm/RankingRulesPanel").then(
      (mod) => mod.RankingRulesPanel
    ),
  { loading: () => <PanelSkeleton /> }
);
const ColdStartPanel = dynamic(
  () =>
    import("@/components/admin/algorithm/ColdStartPanel").then(
      (mod) => mod.ColdStartPanel
    ),
  { loading: () => <PanelSkeleton /> }
);
const FairnessCapsPanel = dynamic(
  () =>
    import("@/components/admin/algorithm/FairnessCapsPanel").then(
      (mod) => mod.FairnessCapsPanel
    ),
  { loading: () => <PanelSkeleton /> }
);
const QualityPenaltiesPanel = dynamic(
  () =>
    import("@/components/admin/algorithm/QualityPenaltiesPanel").then(
      (mod) => mod.QualityPenaltiesPanel
    ),
  { loading: () => <PanelSkeleton /> }
);
const SafetySpamPanel = dynamic(
  () =>
    import("@/components/admin/algorithm/SafetySpamPanel").then(
      (mod) => mod.SafetySpamPanel
    ),
  { loading: () => <PanelSkeleton /> }
);
const ExposureAuditPanel = dynamic(
  () =>
    import("@/components/admin/algorithm/ExposureAuditPanel").then(
      (mod) => mod.ExposureAuditPanel
    ),
  { loading: () => <PanelSkeleton /> }
);
const SimulationPanel = dynamic(
  () =>
    import("@/components/admin/algorithm/SimulationPanel").then(
      (mod) => mod.SimulationPanel
    ),
  { loading: () => <PanelSkeleton /> }
);
const AlgorithmAuditHub = dynamic(
  () =>
    import("@/components/admin/algorithm/AlgorithmAuditHub").then(
      (mod) => mod.AlgorithmAuditHub
    ),
  { loading: () => <PanelSkeleton /> }
);
const AlgorithmAuditTab = dynamic(
  () =>
    import("@/components/admin/algorithm/AlgorithmAuditTab").then(
      (mod) => mod.AlgorithmAuditTab
    ),
  { loading: () => <PanelSkeleton /> }
);

export function AdminAlgorithmControlCenterPage({
  initialTab,
  initialData,
  basePath = "/admin/algorithm"
}: AdminAlgorithmControlCenterPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<AlgorithmControlTabId>(initialTab);
  const [data, setData] = useState(initialData);
  const [pending, startTransition] = useTransition();
  const requestGuard = useLatestRequestGuard();

  const setTabAndUrl = useCallback(
    (next: AlgorithmControlTabId) => {
      setTab(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "overview") params.delete("tab");
      else params.set("tab", next);
      const query = params.toString();
      router.push(query ? `${basePath}?${query}` : basePath);
    },
    [basePath, router, searchParams]
  );

  const refresh = useCallback(() => {
    const requestId = requestGuard.nextRequestId();
    startTransition(async () => {
      const next = await loadAlgorithmSettingsPageData();
      if (!requestGuard.onlyLatest(requestId)) {
        return;
      }
      setData(next);
    });
  }, [requestGuard]);

  const activeTabMeta = ALGORITHM_CONTROL_TABS.find((t) => t.id === tab);

  return (
    <div className="space-y-6">
      <AlgorithmHeader
        canUpdate={data.canUpdate}
        onNavigate={setTabAndUrl}
        onRefresh={refresh}
        pending={pending}
      />

      {data.error ? (
        <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {data.error}
          <p className="mt-2 text-xs text-red-200/80">
            Chạy migration <code className="font-mono">148_algorithm_settings.sql</code> nếu bảng
            chưa tồn tại.
          </p>
        </div>
      ) : null}

      <AlgorithmTabs activeTab={tab} disabled={pending} onChange={setTabAndUrl} />

      {activeTabMeta?.description && tab !== "overview" ? (
        <p className="text-sm text-zinc-500">{activeTabMeta.description}</p>
      ) : null}

      {tab === "overview" ? (
        <AlgorithmOverviewTab data={data} onNavigate={setTabAndUrl} />
      ) : null}

      {SURFACE_TABS.includes(tab as AlgorithmSettingCategory) ? (
        <SurfaceWeightsPanel
          canUpdate={data.canUpdate}
          category={tab as AlgorithmSettingCategory}
          onRefresh={refresh}
          settings={data.settings}
          weightValidations={data.weightValidations}
        />
      ) : null}

      {tab === "search" ? (
        <SearchRankingPanel
          canUpdate={data.canUpdate}
          onRefresh={refresh}
          settings={data.settings}
          weightValidations={data.weightValidations}
        />
      ) : null}

      {tab === "ranking" ? (
        <RankingRulesPanel
          canUpdate={data.canUpdate}
          onRefresh={refresh}
          settings={data.settings}
          weightValidations={data.weightValidations}
        />
      ) : null}

      {tab === "cold_start" ? (
        <ColdStartPanel
          canUpdate={data.canUpdate}
          data={data}
          onRefresh={refresh}
          settings={data.settings}
          weightValidations={data.weightValidations}
        />
      ) : null}

      {tab === "fairness" ? (
        <FairnessCapsPanel
          canUpdate={data.canUpdate}
          onRefresh={refresh}
          settings={data.settings}
          weightValidations={data.weightValidations}
        />
      ) : null}

      {tab === "quality_penalties" ? (
        <QualityPenaltiesPanel
          canUpdate={data.canUpdate}
          onRefresh={refresh}
          settings={data.settings}
          weightValidations={data.weightValidations}
        />
      ) : null}

      {tab === "safety_spam" ? (
        <SafetySpamPanel
          canUpdate={data.canUpdate}
          onRefresh={refresh}
          settings={data.settings}
          weightValidations={data.weightValidations}
        />
      ) : null}

      {tab === "exposure_audit" ? <ExposureAuditPanel /> : null}

      {tab === "simulation" ? <SimulationPanel /> : null}

      {tab === "audit" ? (
        <div className="space-y-6">
          <AlgorithmAuditHub />
          <div>
            <h2 className="mb-3 text-sm font-bold text-white">Nhật ký thay đổi cấu hình</h2>
            <AlgorithmAuditTab logs={data.auditLogs} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
