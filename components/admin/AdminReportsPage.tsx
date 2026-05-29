"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { ReportCaseActionModal } from "@/components/admin/ReportCaseActionModal";
import { ReportCaseCard } from "@/components/admin/ReportCaseCard";
import { ReportCaseDetailDrawer } from "@/components/admin/ReportCaseDetailDrawer";
import { ReportCaseFilters } from "@/components/admin/ReportCaseFilters";
import { ReportSummaryCards } from "@/components/admin/ReportSummaryCards";
import { RecentlyHandledReports } from "@/components/admin/RecentlyHandledReports";
import { Button } from "@/components/ui";
import { getReportCaseDetail } from "@/lib/admin/get-report-case-detail";
import { REPORT_TAB_LABELS } from "@/lib/admin/report-labels";
import { reportCaseAction } from "@/lib/admin/report-case-actions";
import type {
  ReportCaseActionKind,
  ReportCaseDetail,
  ReportCaseQueueItem,
  ReportFilterState,
  ReportPageData,
  ReportResolutionCode,
  ReportTabStatus
} from "@/types/reports";

const TABS: Array<{ id: ReportTabStatus; label: string }> = [
  { id: "all", label: REPORT_TAB_LABELS.all },
  { id: "pending", label: REPORT_TAB_LABELS.pending },
  { id: "reviewing", label: REPORT_TAB_LABELS.reviewing },
  { id: "resolved", label: REPORT_TAB_LABELS.resolved },
  { id: "rejected", label: REPORT_TAB_LABELS.rejected },
  { id: "urgent", label: REPORT_TAB_LABELS.urgent }
];

const defaultFilters: ReportFilterState = {
  search: "",
  targetType: "all",
  reasonCode: "all",
  severity: "all",
  status: "pending",
  dateRange: "all",
  assignee: "",
  multiReport: "all"
};

const CONTENT_TYPES = ["story", "chapter", "episode", "comment", "community_post"];

function withinDateRange(createdAt: string, range: ReportFilterState["dateRange"]) {
  if (range === "all") return true;
  const diff = Date.now() - new Date(createdAt).getTime();
  const day = 86_400_000;
  if (range === "today") return diff < day;
  if (range === "7d") return diff < 7 * day;
  if (range === "30d") return diff < 30 * day;
  return true;
}

function matchesStatus(item: ReportCaseQueueItem, status: ReportTabStatus) {
  if (status === "all") return true;
  if (status === "urgent") return item.severity === "urgent" || item.severity === "high";
  if (status === "pending") return item.status === "pending";
  if (status === "reviewing") return item.status === "reviewing";
  if (status === "resolved")
    return ["resolved", "resolved_action_taken", "resolved_no_violation", "reviewed", "escalated"].includes(
      item.status
    );
  if (status === "rejected") return item.status === "rejected" || item.status === "rejected_abuse";
  return true;
}

type AdminReportsPageProps = {
  data: ReportPageData;
};

export function AdminReportsPage({ data }: AdminReportsPageProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<ReportTabStatus>("pending");
  const [filters, setFilters] = useState<ReportFilterState>(defaultFilters);
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const [cardFilter, setCardFilter] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(data.error);

  const [selected, setSelected] = useState<ReportCaseQueueItem | null>(null);
  const [detail, setDetail] = useState<ReportCaseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<ReportCaseActionKind>("resolve");
  const [modalTarget, setModalTarget] = useState<ReportCaseQueueItem | null>(null);

  const effectiveTab = useMemo(() => {
    if (cardFilter === "pending") return "pending";
    if (cardFilter === "reviewing") return "reviewing";
    if (cardFilter === "high") return "urgent";
    if (cardFilter === "content") return "pending";
    return tab;
  }, [cardFilter, tab]);

  const filteredCases = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return data.cases.filter((item) => {
      if (!matchesStatus(item, effectiveTab)) return false;
      if (filters.status !== "all" && !matchesStatus(item, filters.status)) return false;

      if (cardFilter === "content" && !CONTENT_TYPES.includes(item.targetType)) return false;
      if (cardFilter === "message" && item.targetType !== "message") return false;
      if (cardFilter === "high" && item.severity !== "high" && item.severity !== "urgent")
        return false;

      if (filters.targetType !== "all" && item.targetType !== filters.targetType) return false;
      if (filters.reasonCode !== "all" && item.primaryReasonCode !== filters.reasonCode)
        return false;
      if (filters.severity !== "all" && item.severity !== filters.severity) return false;
      if (filters.multiReport === "2plus" && item.reportCount < 2) return false;
      if (filters.multiReport === "10plus" && item.reportCount < 10) return false;
      if (!withinDateRange(item.latestAt, filters.dateRange)) return false;

      if (filters.assignee.trim()) {
        const a = filters.assignee.trim().toLowerCase();
        if (!(item.assignedToName ?? "").toLowerCase().includes(a)) return false;
      }

      if (q) {
        const hay = `${item.title} ${item.targetId} ${item.reportedUserName ?? ""} ${item.latestReporterName ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [data.cases, effectiveTab, filters, cardFilter]);

  const handleCardFilter = useCallback((filter: string | null) => {
    if (filter === "message") {
      window.location.href = "/admin/messaging";
      return;
    }
    setCardFilter(filter);
    if (filter === "pending") setTab("pending");
    if (filter === "reviewing") setTab("reviewing");
    if (filter === "high") setTab("urgent");
  }, []);

  const openDetail = async (item: ReportCaseQueueItem) => {
    setSelected(item);
    setDrawerOpen(true);
    setDetailLoading(true);
    setDetail(null);
    const res = await getReportCaseDetail(item);
    setDetail(res.detail);
    setDetailLoading(false);
  };

  const runAction = (
    item: ReportCaseQueueItem,
    action: ReportCaseActionKind,
    payload?: { resolutionCode: ReportResolutionCode | null; note: string }
  ) => {
    startTransition(async () => {
      const result = await reportCaseAction({
        targetType: item.targetType,
        targetId: item.targetId,
        action,
        resolutionCode: payload?.resolutionCode ?? null,
        note: payload?.note ?? ""
      });

      if (!result.ok) {
        setToast(("error" in result && result.error) ? result.error : "Không thể xử lý.");
        return;
      }

      setToast(("message" in result && result.message) ? result.message : "Đã lưu.");
      setModalOpen(false);
      setDrawerOpen(false);
      setSelected(null);
      router.refresh();
    });
  };

  const openModal = (item: ReportCaseQueueItem, action: ReportCaseActionKind) => {
    if (action === "assign") {
      runAction(item, "assign", { resolutionCode: null, note: "" });
      return;
    }
    setModalTarget(item);
    setModalAction(action);
    setModalOpen(true);
  };

  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-6">
      <header className="space-y-2 border-b border-white/10 pb-6">
        <Link
          className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          href="/admin"
        >
          ← Trung tâm quản trị
        </Link>
        <p className="mt-4 text-sm font-medium uppercase tracking-wide text-cyan-300">
          ChapMee Admin
        </p>
        <h1 className="text-3xl font-bold tracking-normal text-white">Báo cáo vi phạm</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
          Xem, phân loại và xử lý báo cáo từ người dùng về nội dung, bình luận, tin nhắn và
          tài khoản.
        </p>
        <p className="text-xs text-zinc-500">
          Báo cáo không tự động xóa nội dung. Mỗi quyết định xử lý cần được ghi nhận rõ ràng.
        </p>
      </header>

      {loadError ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-300">{loadError}</p>
          <Button
            className="mt-2"
            onClick={() => {
              setLoadError(null);
              router.refresh();
            }}
            type="button"
            variant="secondary"
          >
            Thử lại
          </Button>
        </div>
      ) : null}

      {toast ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {toast}
        </p>
      ) : null}

      {!data.canModerate ? (
        <p className="text-sm text-amber-300">
          Bạn chỉ có quyền xem. Không thể thực hiện hành động xử lý báo cáo.
        </p>
      ) : null}

      <ReportSummaryCards
        activeFilter={cardFilter}
        onFilter={handleCardFilter}
        summary={data.summary}
      />

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-1">
        {TABS.map((t) => (
          <button
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${
              effectiveTab === t.id
                ? "border-b-2 border-cyan-400 text-cyan-300"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
            key={t.id}
            onClick={() => {
              setTab(t.id);
              setCardFilter(null);
            }}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      <ReportCaseFilters
        collapsed={filtersCollapsed}
        filters={filters}
        onChange={(next) => setFilters((f) => ({ ...f, ...next }))}
        onToggleCollapse={() => setFiltersCollapsed((c) => !c)}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">Hàng đợi báo cáo</h2>
          <span className="text-sm text-zinc-500">{filteredCases.length} case</span>
        </div>

        {filteredCases.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
            <p className="font-medium text-zinc-300">Hàng đợi báo cáo trống</p>
            <p className="mt-1 text-sm text-zinc-500">
              Không có báo cáo nào trong trạng thái này.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filteredCases.map((item) => (
              <li key={item.caseKey}>
                <ReportCaseCard
                  canModerate={data.canModerate}
                  disabled={pending}
                  item={item}
                  onAssign={() => openModal(item, "assign")}
                  onDismiss={() => openModal(item, "dismiss")}
                  onResolve={() => openModal(item, "resolve")}
                  onView={() => openDetail(item)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 border-t border-white/10 pt-6">
        <h2 className="text-lg font-semibold text-white">Đã xử lý gần đây</h2>
        <RecentlyHandledReports items={data.recentlyHandled} />
        <p className="text-xs text-zinc-600">
          Hôm nay: {data.summary.resolvedToday} hành động xử lý
        </p>
      </section>

      <ReportCaseDetailDrawer
        actionDisabled={pending || !data.canModerate}
        canModerate={data.canModerate}
        detail={detail}
        loading={detailLoading}
        onAssign={() => selected && openModal(selected, "assign")}
        onClose={() => {
          setDrawerOpen(false);
          setSelected(null);
        }}
        onDismiss={() => selected && openModal(selected, "dismiss")}
        onEscalate={() => selected && openModal(selected, "escalate")}
        onHideContent={() => selected && openModal(selected, "hide_content")}
        onResolve={() => selected && openModal(selected, "resolve")}
        onWarn={() => selected && openModal(selected, "warn_user")}
        open={drawerOpen}
      />

      <ReportCaseActionModal
        action={modalAction}
        loading={pending}
        onClose={() => setModalOpen(false)}
        onConfirm={(payload) => {
          if (modalTarget) runAction(modalTarget, modalAction, payload);
        }}
        open={modalOpen}
      />
    </div>
  );
}
