"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { TaxonomyAuditTab } from "@/components/admin/taxonomy/TaxonomyAuditTab";
import { TaxonomyDetailPanel } from "@/components/admin/taxonomy/TaxonomyDetailPanel";
import { TaxonomyHeader } from "@/components/admin/taxonomy/TaxonomyHeader";
import { TaxonomyHealthCards } from "@/components/admin/taxonomy/TaxonomyHealthCards";
import { TaxonomyImportModal } from "@/components/admin/taxonomy/TaxonomyImportModal";
import { TaxonomyOverviewPanel } from "@/components/admin/taxonomy/TaxonomyOverviewPanel";
import { TaxonomyQualityPanel } from "@/components/admin/taxonomy/TaxonomyQualityPanel";
import { TaxonomyRequestsPanel } from "@/components/admin/taxonomy/TaxonomyRequestsPanel";
import { TaxonomySegmentNav } from "@/components/admin/taxonomy/TaxonomySegmentNav";
import { TaxonomyTemplatesPanel } from "@/components/admin/taxonomy/TaxonomyTemplatesPanel";
import { TaxonomyTermsTable } from "@/components/admin/taxonomy/TaxonomyTermsTable";
import {
  exportTaxonomyTermsCsvAction,
  exportTaxonomyTermsJsonAction,
  getCatalogQualityAdminAction,
  getTaxonomyDashboardStatsAction
} from "@/lib/admin/taxonomy-actions";
import {
  parseTaxonomyGroupFilter,
  TAXONOMY_ADMIN_SEGMENTS,
  TAXONOMY_GROUP_OPTIONS,
  TAXONOMY_TEMPLATES_TAB,
  type TaxonomyAdminTabId
} from "@/lib/taxonomy/admin-tabs";
import type {
  TaxonomyAdminDashboardStats,
  TaxonomyAuditLogRow,
  TaxonomyTermAdminRow
} from "@/lib/taxonomy/admin-data";
import type { CatalogQualitySummary } from "@/lib/taxonomy/catalog-quality";
import type { TaxonomyAdminNotify } from "@/lib/taxonomy/admin-ui";
import type { TaxonomyRequestRow } from "@/types/taxonomy";
import type { TaxonomyType } from "@/types/taxonomy";
import type { TaxonomyImportExportJobRow } from "@/types/taxonomy-import-export";
import { TaxonomyImportExportPage } from "@/components/admin/taxonomy/TaxonomyImportExportPage";

type AdminBanner = { text: string; variant: "success" | "error" };

type ImportExportBundle = {
  initialJobs: TaxonomyImportExportJobRow[];
  initialJobsTotal: number;
  initialHistoryPage: number;
  loadError: string | null;
  permissions: { canView: boolean; canImport: boolean; canExport: boolean };
};

type AdminTaxonomyCenterProps = {
  initialTab: TaxonomyAdminTabId;
  initialGroup: TaxonomyType | "all";
  initialStats: TaxonomyAdminDashboardStats;
  initialQuality: CatalogQualitySummary;
  initialAuditLogs: TaxonomyAuditLogRow[];
  initialAuditTotal: number;
  initialAuditError: string | null;
  initialRequests: TaxonomyRequestRow[];
  initialRequestsTotal: number;
  initialTerms?: TaxonomyTermAdminRow[];
  initialTermsTotal?: number;
  initialTermsError?: string | null;
  importExport?: ImportExportBundle | null;
  loadError: string | null;
};

export function AdminTaxonomyCenter({
  initialTab,
  initialGroup,
  initialStats,
  initialQuality,
  initialAuditLogs,
  initialAuditTotal,
  initialAuditError,
  initialRequests,
  initialRequestsTotal,
  initialTerms = [],
  initialTermsTotal = 0,
  initialTermsError = null,
  importExport,
  loadError
}: AdminTaxonomyCenterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TaxonomyAdminTabId>(initialTab);
  const [groupFilter, setGroupFilter] = useState<TaxonomyType | "all">(initialGroup);
  const [stats, setStats] = useState(initialStats);
  const [quality, setQuality] = useState(initialQuality);
  const [selectedTerm, setSelectedTerm] = useState<TaxonomyTermAdminRow | null>(null);
  const [focusTermId, setFocusTermId] = useState<string | null>(null);
  const [banner, setBanner] = useState<AdminBanner | null>(
    loadError ? { text: loadError, variant: "error" } : null
  );
  const [importOpen, setImportOpen] = useState(false);
  const [createNonce, setCreateNonce] = useState(0);
  const [panelAction, setPanelAction] = useState<{
    type: "edit" | "merge" | "stories" | "toggle";
    term: TaxonomyTermAdminRow;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const setTabAndUrl = useCallback(
    (next: TaxonomyAdminTabId, group?: TaxonomyType | "all") => {
      setTab(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "overview") params.delete("tab");
      else params.set("tab", next);
      if (group && group !== "all") params.set("group", group);
      else params.delete("group");
      const query = params.toString();
      router.push(query ? `/admin/taxonomy?${query}` : "/admin/taxonomy");
    },
    [router, searchParams]
  );

  const refreshStats = useCallback(() => {
    startTransition(async () => {
      const [nextStats, nextQuality] = await Promise.all([
        getTaxonomyDashboardStatsAction(),
        getCatalogQualityAdminAction()
      ]);
      setStats({ ...nextStats, qualityAlerts: nextQuality.summary.totalIssues });
      setQuality(nextQuality.summary);
    });
  }, []);

  const notify: TaxonomyAdminNotify = useCallback((text, variant = "error") => {
    if (!text) {
      setBanner(null);
      return;
    }
    setBanner({ text, variant });
  }, []);

  const exportScope =
    groupFilter !== "all" ? { types: [groupFilter] as TaxonomyType[] } : undefined;

  function downloadText(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openManageTerm(termId: string) {
    setFocusTermId(termId);
    setTabAndUrl("manage");
  }

  return (
    <div className="space-y-5">
      <TaxonomyHeader
        onAddTaxonomy={() => {
          setCreateNonce((n) => n + 1);
          setTabAndUrl("manage");
        }}
        onExportCsv={() =>
          startTransition(async () => {
            const result = await exportTaxonomyTermsCsvAction(exportScope);
            if (result.error) {
              notify(result.error);
              return;
            }
            downloadText(result.csv, `taxonomy-${Date.now()}.csv`, "text/csv");
            notify("Đã xuất CSV.", "success");
          })
        }
        onExportJson={() =>
          startTransition(async () => {
            const result = await exportTaxonomyTermsJsonAction(exportScope);
            if (result.error) {
              notify(result.error);
              return;
            }
            downloadText(result.json, `taxonomy-${Date.now()}.json`, "application/json");
            notify("Đã xuất JSON.", "success");
          })
        }
        onImportExport={() => setTabAndUrl("import_export")}
        onOpenTemplates={() => setTabAndUrl(TAXONOMY_TEMPLATES_TAB)}
        onPendingRequests={() => setTabAndUrl("requests")}
        onQuickImport={() => setImportOpen(true)}
        pending={pending}
        pendingRequests={stats.pendingRequests}
      />

      {banner ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            banner.variant === "success"
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
              : "border-amber-400/20 bg-amber-400/10 text-amber-100"
          }`}
        >
          {banner.text}
          <button className="ml-3 text-xs underline" onClick={() => setBanner(null)} type="button">
            Đóng
          </button>
        </div>
      ) : null}

      {stats.error ? (
        <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {stats.error}
        </div>
      ) : null}

      {stats.totalTerms === 0 && !stats.error ? (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          Chưa có dữ liệu taxonomy trong database. Chạy{" "}
          <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs">npm run db:legacy</code> (migration{" "}
          <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs">161_taxonomy_seed.sql</code>) rồi tải
          lại trang.
        </div>
      ) : null}

      <TaxonomyHealthCards
        onNavigate={(target) => {
          if (target === "requests") setTabAndUrl("requests");
          else if (target === "quality") setTabAndUrl("quality");
          else setTabAndUrl("manage");
        }}
        qualityAlerts={quality.totalIssues}
        stats={{ ...stats, qualityAlerts: quality.totalIssues }}
      />

      <TaxonomySegmentNav
        active={
          tab === TAXONOMY_TEMPLATES_TAB
            ? null
            : (TAXONOMY_ADMIN_SEGMENTS.some((s) => s.id === tab) ? tab : "overview")
        }
        disabled={pending}
        onChange={(next) => setTabAndUrl(next)}
        pendingRequests={stats.pendingRequests}
        qualityAlerts={quality.totalIssues}
      />

      {tab === "overview" ? (
        <TaxonomyOverviewPanel
          auditError={initialAuditError}
          auditLogs={initialAuditLogs}
          auditTotal={initialAuditTotal}
          onOpenManage={() => setTabAndUrl("manage")}
          onOpenTab={(id) => setTabAndUrl(id as TaxonomyAdminTabId)}
          onViewAudit={() => setTabAndUrl("audit")}
          qualityAlerts={quality.totalIssues}
          stats={stats}
        />
      ) : null}

      {tab === "manage" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-zinc-500" htmlFor="taxonomy-group-filter">
              Nhóm taxonomy
            </label>
            <select
              className="min-h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-white"
              id="taxonomy-group-filter"
              onChange={(e) => {
                const next = parseTaxonomyGroupFilter(e.target.value);
                setGroupFilter(next);
                setSelectedTerm(null);
              }}
              value={groupFilter}
            >
              {TAXONOMY_GROUP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <TaxonomyTermsTable
              actionRequest={panelAction}
              createNonce={createNonce}
              focusTermId={focusTermId}
              groupFilter={groupFilter}
              initialItems={initialTerms}
              initialLoadError={initialTermsError}
              initialTotal={initialTermsTotal}
              onActionRequestHandled={() => setPanelAction(null)}
              onMessage={notify}
              onSelect={setSelectedTerm}
              onStatsRefresh={refreshStats}
              selectedId={selectedTerm?.id ?? null}
            />
            <TaxonomyDetailPanel
              onEdit={(term) => setPanelAction({ type: "edit", term })}
              onMerge={(term) => setPanelAction({ type: "merge", term })}
              onToggle={(term) => setPanelAction({ type: "toggle", term })}
              onViewAudit={() => setTabAndUrl("audit")}
              onViewStories={(term) => setPanelAction({ type: "stories", term })}
              term={selectedTerm}
            />
          </div>
        </div>
      ) : null}

      {tab === "requests" ? (
        <TaxonomyRequestsPanel
          initialRequests={initialRequests}
          initialTotal={initialRequestsTotal}
          onMessage={notify}
          onStatsRefresh={refreshStats}
        />
      ) : null}

      {tab === "quality" ? (
        <TaxonomyQualityPanel
          onMessage={notify}
          onOpenTerm={openManageTerm}
          onRefresh={refreshStats}
          pending={pending}
          summary={quality}
        />
      ) : null}

      {tab === "import_export" && importExport ? (
        <TaxonomyImportExportPage
          initialHistoryPage={importExport.initialHistoryPage}
          initialJobs={importExport.initialJobs}
          initialJobsTotal={importExport.initialJobsTotal}
          loadError={importExport.loadError}
          permissions={importExport.permissions}
        />
      ) : null}

      {tab === "audit" ? (
        <TaxonomyAuditTab
          initialLogs={initialAuditLogs}
          initialTotal={initialAuditTotal}
          onMessage={notify}
        />
      ) : null}

      {tab === TAXONOMY_TEMPLATES_TAB ? (
        <TaxonomyTemplatesPanel onMessage={notify} />
      ) : null}

      <TaxonomyImportModal
        exportScope={exportScope}
        onClose={() => setImportOpen(false)}
        onDone={() => {
          refreshStats();
          setImportOpen(false);
        }}
        onMessage={notify}
        open={importOpen}
      />
    </div>
  );
}
