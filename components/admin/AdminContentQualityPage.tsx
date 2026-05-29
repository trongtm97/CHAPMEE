"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { ContentQualityActionModal,
  type ContentQualityActionKind
} from "@/components/admin/ContentQualityActionModal";
import { QualityCoinRefundModal } from "@/components/admin/QualityCoinRefundModal";
import { SetContentFreeModal } from "@/components/admin/SetContentFreeModal";
import {
  disableContentMonetizationAction,
  restoreContentPaidStatusAction
} from "@/lib/admin/quality-monetization-actions";
import { MONETIZATION_STATUS_LABELS } from "@/lib/admin/quality-refund-constants";
import { ContentQualityDetailDrawer } from "@/components/admin/ContentQualityDetailDrawer";
import {
  ContentQualityFilters,
  type ContentQualityFilterState
} from "@/components/admin/ContentQualityFilters";
import { ContentQualityItemCard } from "@/components/admin/ContentQualityItemCard";
import { ContentQualityRecentlyHandled } from "@/components/admin/ContentQualityRecentlyHandled";
import { ContentQualitySummaryCards } from "@/components/admin/ContentQualitySummaryCards";
import { Button } from "@/components/ui";
import {
  adminConfirmLowQualityAction,
  adminHideTemporarilyAction,
  adminPermanentHideAction,
  adminRestoreQualityAction
} from "@/lib/admin/admin-quality-actions";
import { matchesQualityTab } from "@/lib/admin/content-quality-tabs";
import { getContentQualityAdminDetail } from "@/lib/admin/get-content-quality-admin-detail";
import type {
  AdminContentQualityPageData,
  AdminContentQualityQueueItem,
  AdminContentQualityTab
} from "@/types/admin";
import type { ContentQualityReasonCode } from "@/types/content-quality";

const TABS: Array<{ id: AdminContentQualityTab; label: string }> = [
  { id: "pending_review", label: "Cần xét duyệt" },
  { id: "waiting_author", label: "Chờ tác giả sửa" },
  { id: "appealing", label: "Đang khiếu nại" },
  { id: "at_risk", label: "Nguy cơ ẩn vĩnh viễn" },
  { id: "restored", label: "Đã khôi phục" },
  { id: "permanently_hidden", label: "Đã ẩn vĩnh viễn" },
  { id: "all", label: "Tất cả" }
];

const defaultFilters: ContentQualityFilterState = {
  search: "",
  targetType: "all",
  riskLevel: "all",
  attempt: "all",
  status: "all",
  monetization: "all",
  dateRange: "all"
};

function withinDateRange(iso: string | null, range: ContentQualityFilterState["dateRange"]) {
  if (!iso || range === "all") return true;
  const diff = Date.now() - new Date(iso).getTime();
  const day = 86_400_000;
  if (range === "today") return diff < day;
  if (range === "7d") return diff < 7 * day;
  if (range === "30d") return diff < 30 * day;
  return true;
}

type AdminContentQualityPageProps = {
  data: AdminContentQualityPageData;
  activeTab: AdminContentQualityTab;
};

export function AdminContentQualityPage({ data, activeTab: initialTab }: AdminContentQualityPageProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<AdminContentQualityTab>(initialTab);
  const [filters, setFilters] = useState<ContentQualityFilterState>(defaultFilters);
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const [cardFilter, setCardFilter] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(data.error);

  const [selected, setSelected] = useState<AdminContentQualityQueueItem | null>(null);
  const [detailPayload, setDetailPayload] = useState<
    Awaited<ReturnType<typeof getContentQualityAdminDetail>>["data"] | null
  >(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<ContentQualityActionKind>("request_changes");
  const [modalTarget, setModalTarget] = useState<AdminContentQualityQueueItem | null>(null);

  const [freeModalOpen, setFreeModalOpen] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundMode, setRefundMode] = useState<"refund" | "free_and_refund">("refund");

  const effectiveTab = useMemo(() => {
    if (cardFilter && cardFilter !== "monetization") {
      return cardFilter as AdminContentQualityTab;
    }
    return tab;
  }, [cardFilter, tab]);

  const filteredItems = useMemo(() => {
    const q = filters.search.trim().toLowerCase();

    return data.allItems.filter((item) => {
      if (!matchesQualityTab(effectiveTab, item)) return false;
      if (cardFilter === "monetization" && !item.monetizationDisabled) return false;
      if (filters.riskLevel !== "all" && item.riskLevel !== filters.riskLevel) return false;
      if (filters.attempt !== "all" && item.attemptCount !== Number(filters.attempt)) return false;
      if (filters.monetization === "enabled" && item.monetizationDisabled) return false;
      if (filters.monetization === "disabled" && !item.monetizationDisabled) return false;
      if (!withinDateRange(item.warnedAt, filters.dateRange)) return false;

      if (q) {
        const hay = `${item.title} ${item.storyId} ${item.authorPenName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [data.allItems, effectiveTab, filters, cardFilter]);

  const handleCardFilter = useCallback((filter: string | null) => {
    setCardFilter(filter);
    if (filter && filter !== "monetization") {
      setTab(filter as AdminContentQualityTab);
    }
  }, []);

  const openDetail = async (item: AdminContentQualityQueueItem) => {
    setSelected(item);
    setDrawerOpen(true);
    setDetailLoading(true);
    setDetailPayload(null);
    const res = await getContentQualityAdminDetail(item.storyId);
    setDetailPayload(res.data);
    setDetailLoading(false);
  };

  function refreshDetail(storyId: string) {
    setDetailLoading(true);
    void getContentQualityAdminDetail(storyId).then((result) => {
      setDetailPayload(result.data);
      setDetailLoading(false);
    });
  }

  function handleMonetizationSuccess(message: string) {
    setToast(message);
    router.refresh();
    if (selected) refreshDetail(selected.storyId);
  }

  function runDisableMonetization() {
    if (!selected) return;
    startTransition(async () => {
      const result = await disableContentMonetizationAction({
        storyId: selected.storyId,
        reason: "quality_low"
      });
      if (!result.ok) {
        setToast(result.error ?? "Không thể tắt kiếm tiền.");
        return;
      }
      handleMonetizationSuccess("Đã tắt kiếm tiền do chất lượng.");
    });
  }

  function runRestorePaid() {
    if (!selected) return;
    startTransition(async () => {
      const result = await restoreContentPaidStatusAction({ storyId: selected.storyId });
      if (!result.ok) {
        setToast(result.error ?? "Không thể khôi phục trạng thái trả phí.");
        return;
      }
      handleMonetizationSuccess("Đã khôi phục trạng thái trả phí.");
    });
  }

  const runAction = (
    item: AdminContentQualityQueueItem,
    action: ContentQualityActionKind,
    payload: { reasonCodes: ContentQualityReasonCode[]; note: string }
  ) => {
    startTransition(async () => {
      let result: { ok: boolean; error?: string };

      if (action === "request_changes") {
        result = await adminConfirmLowQualityAction({
          storyId: item.storyId,
          moderatorNote: payload.note,
          reasonCodes: payload.reasonCodes.length
            ? payload.reasonCodes
            : ["moderator_confirmed_low_quality"]
        });
      } else if (action === "restore") {
        result = await adminRestoreQualityAction({
          storyId: item.storyId,
          moderatorNote: payload.note
        });
      } else if (action === "hide_temp") {
        result = await adminHideTemporarilyAction({
          storyId: item.storyId,
          moderatorNote: payload.note
        });
      } else {
        result = await adminPermanentHideAction({
          storyId: item.storyId,
          moderatorNote: payload.note
        });
      }

      if (!result.ok) {
        setToast(result.error ?? "Không thể xử lý.");
        return;
      }

      setToast("Đã cập nhật trạng thái chất lượng.");
      setModalOpen(false);
      setDrawerOpen(false);
      setSelected(null);
      router.refresh();
    });
  };

  const openModal = (item: AdminContentQualityQueueItem, action: ContentQualityActionKind) => {
    setModalTarget(item);
    setModalAction(action);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
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
        <p className="text-sm text-amber-300">Bạn chỉ có quyền xem hàng đợi chất lượng.</p>
      ) : null}

      <ContentQualitySummaryCards
        activeFilter={cardFilter}
        onFilter={handleCardFilter}
        summary={data.summary}
      />

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex min-w-max gap-2 border-b border-white/10 pb-1">
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
              {t.label} ({data.counts[t.id]})
            </button>
          ))}
        </div>
      </div>

      <ContentQualityFilters
        collapsed={filtersCollapsed}
        filters={filters}
        onChange={(next) => setFilters((f) => ({ ...f, ...next }))}
        onToggleCollapse={() => setFiltersCollapsed((c) => !c)}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">Hàng đợi chất lượng</h2>
          <span className="text-sm text-zinc-500">{filteredItems.length} mục</span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
            <p className="font-medium text-zinc-300">Không có nội dung cần xử lý</p>
            <p className="mt-1 text-sm text-zinc-500">
              Nội dung bị đánh giá thấp hoặc được tác giả gửi lại sẽ xuất hiện tại đây.
            </p>
            <p className="mt-3 text-xs text-zinc-600">
              Quy tắc hiện tại: tối đa {data.maxAttempts} lần xử lý trước khi có thể ẩn vĩnh viễn.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filteredItems.map((item) => (
              <li key={item.storyId}>
                <ContentQualityItemCard
                  canModerate={data.canModerate}
                  disabled={pending}
                  item={item}
                  onHideTemp={() => openModal(item, "hide_temp")}
                  onPermanentHide={() => openModal(item, "permanent_hide")}
                  onRequestChanges={() => openModal(item, "request_changes")}
                  onRestore={() => openModal(item, "restore")}
                  onView={() => openDetail(item)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 border-t border-white/10 pt-6">
        <h2 className="text-lg font-semibold text-white">Đã xử lý gần đây</h2>
        <ContentQualityRecentlyHandled items={data.recentlyHandled} />
        <p className="text-xs text-zinc-600">
          Hôm nay: {data.summary.processedToday} hành động ·{" "}
          <Link className="text-cyan-400 hover:text-cyan-300" href="/admin/content-quality/rules">
            Xem rule chất lượng
          </Link>
        </p>
      </section>

      <ContentQualityDetailDrawer
        actionDisabled={pending}
        canManageMonetization={data.canManageMonetization}
        canModerate={data.canModerate}
        canRefund={data.canRefund}
        item={selected}
        loading={detailLoading}
        onClose={() => {
          setDrawerOpen(false);
          setSelected(null);
        }}
        onDisableMonetization={runDisableMonetization}
        onHideTemp={() => selected && openModal(selected, "hide_temp")}
        onPermanentHide={() => selected && openModal(selected, "permanent_hide")}
        onRefund={() => {
          setRefundMode("refund");
          setRefundModalOpen(true);
        }}
        onRequestChanges={() => selected && openModal(selected, "request_changes")}
        onRestore={() => selected && openModal(selected, "restore")}
        onRestorePaid={runRestorePaid}
        onSetFree={() => setFreeModalOpen(true)}
        onSetFreeAndRefund={() => {
          setRefundMode("free_and_refund");
          setRefundModalOpen(true);
        }}
        open={drawerOpen}
        payload={detailPayload}
      />

      {selected ? (
        <>
          <SetContentFreeModal
            buyerCount={detailPayload?.monetizationImpact?.buyerCount ?? 0}
            currentStatusLabel={
              MONETIZATION_STATUS_LABELS[
                detailPayload?.monetizationImpact?.monetizationStatus ?? "paid"
              ] ?? "Trả phí"
            }
            onClose={() => setFreeModalOpen(false)}
            onSuccess={handleMonetizationSuccess}
            open={freeModalOpen}
            storyId={selected.storyId}
            storyTitle={selected.title}
          />
          <QualityCoinRefundModal
            mode={refundMode}
            onClose={() => setRefundModalOpen(false)}
            onSuccess={handleMonetizationSuccess}
            open={refundModalOpen}
            storyId={selected.storyId}
            storyTitle={selected.title}
          />
        </>
      ) : null}

      <ContentQualityActionModal
        action={modalAction}
        attemptCount={modalTarget?.attemptCount ?? 0}
        loading={pending}
        maxAttempts={modalTarget?.maxAttempts ?? data.maxAttempts}
        onClose={() => setModalOpen(false)}
        onConfirm={(payload) => {
          if (modalTarget) runAction(modalTarget, modalAction, payload);
        }}
        open={modalOpen}
      />
    </div>
  );
}
