"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { ContentReviewActionModal } from "@/components/admin/ContentReviewActionModal";
import { ContentReviewDetailDrawer } from "@/components/admin/ContentReviewDetailDrawer";
import {
  ContentReviewFilters,
  type ContentReviewFilterState
} from "@/components/admin/ContentReviewFilters";
import { ContentReviewItemCard } from "@/components/admin/ContentReviewItemCard";
import { ContentReviewSummaryCards } from "@/components/admin/ContentReviewSummaryCards";
import { RecentlyReviewedList } from "@/components/admin/RecentlyReviewedList";
import { ErrorState } from "@/components/ui";
import { getContentReviewDetail } from "@/lib/admin/get-content-review-detail";
import {
  reviewContentAction,
  sendToQualityReviewAction
} from "@/lib/admin/review-content-action";
import type {
  ContentReviewActionKind,
  ContentReviewDetail,
  ContentReviewPageData,
  ContentReviewQueueItem,
  ContentReviewReasonCode,
  ContentReviewTab
} from "@/types/admin-content-review";

const TABS: Array<{ id: ContentReviewTab; label: string }> = [
  { id: "all", label: "Tất cả" },
  { id: "story", label: "Truyện" },
  { id: "episode", label: "Chương" },
  { id: "community", label: "Cộng đồng" },
  { id: "comment", label: "Bình luận" },
  { id: "processed", label: "Đã xử lý" }
];

const defaultFilters: ContentReviewFilterState = {
  search: "",
  status: "all",
  type: "all",
  genre: "",
  author: "",
  dateRange: "all",
  monetization: "all"
};

type AdminContentReviewPageProps = {
  data: ContentReviewPageData;
};

function typeMatchesTab(type: ContentReviewQueueItem["type"], tab: ContentReviewTab) {
  if (tab === "all") return true;
  if (tab === "story") return type === "story";
  if (tab === "episode") return type === "episode";
  if (tab === "community") return type === "community_post";
  if (tab === "comment") return type === "comment";
  return false;
}

function withinDateRange(createdAt: string, range: ContentReviewFilterState["dateRange"]) {
  if (range === "all") return true;
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const day = 86_400_000;
  if (range === "today") return now - created < day;
  if (range === "7d") return now - created < 7 * day;
  if (range === "30d") return now - created < 30 * day;
  return true;
}

export function AdminContentReviewPage({ data }: AdminContentReviewPageProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<ContentReviewTab>("all");
  const [filters, setFilters] = useState<ContentReviewFilterState>(defaultFilters);
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const [cardFilter, setCardFilter] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<ContentReviewQueueItem | null>(null);
  const [detail, setDetail] = useState<ContentReviewDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<ContentReviewActionKind>("reject");
  const [modalTarget, setModalTarget] = useState<ContentReviewQueueItem | null>(null);

  const genres = useMemo(() => {
    const set = new Set<string>();
    for (const item of data.queue) {
      if (item.genreName) set.add(item.genreName);
    }
    return [...set].sort();
  }, [data.queue]);

  const effectiveTab = useMemo(() => {
    if (cardFilter === "story") return "story";
    if (cardFilter === "episode") return "episode";
    if (cardFilter === "community") return "community";
    if (cardFilter === "processed") return "processed";
    return tab;
  }, [cardFilter, tab]);

  const filteredQueue = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return data.queue.filter((item) => {
      if (!typeMatchesTab(item.type, effectiveTab === "processed" ? "all" : effectiveTab)) {
        if (effectiveTab !== "processed") return false;
      }
      if (effectiveTab === "processed") return false;

      if (filters.status !== "all" && item.status !== filters.status) return false;
      if (filters.type !== "all" && !typeMatchesTab(item.type, filters.type)) return false;
      if (filters.genre && item.genreName !== filters.genre) return false;
      if (filters.monetization === "yes" && !item.hasMonetization) return false;
      if (filters.monetization === "no" && item.hasMonetization) return false;
      if (!withinDateRange(item.createdAt, filters.dateRange)) return false;

      if (filters.author.trim()) {
        const a = filters.author.trim().toLowerCase();
        const hay = `${item.creatorName ?? ""} ${item.creatorUsername ?? ""}`.toLowerCase();
        if (!hay.includes(a)) return false;
      }

      if (q) {
        const hay = `${item.title} ${item.id} ${item.creatorName ?? ""} ${item.creatorUsername ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [data.queue, effectiveTab, filters]);

  const showProcessed = effectiveTab === "processed" || cardFilter === "processed";

  const handleCardFilter = useCallback(
    (filter: string | null) => {
      if (filter === "reports") {
        router.push("/admin/reports");
        return;
      }
      setCardFilter(filter);
      if (filter === "story" || filter === "episode" || filter === "community") {
        setTab(filter);
      }
      if (filter === "processed") {
        setTab("processed");
      }
    },
    [router]
  );

  const openDetail = async (item: ContentReviewQueueItem) => {
    setSelected(item);
    setDrawerOpen(true);
    setDetailLoading(true);
    setDetail(null);
    const res = await getContentReviewDetail(item);
    setDetail(res.detail);
    setDetailLoading(false);
    if (res.error) setError(res.error);
  };

  const runAction = (
    item: ContentReviewQueueItem,
    action: ContentReviewActionKind,
    payload?: { reasonCode: ContentReviewReasonCode | null; note: string }
  ) => {
    startTransition(async () => {
      setError(null);
      const result = await reviewContentAction({
        type: item.type,
        id: item.id,
        action,
        reasonCode: payload?.reasonCode ?? null,
        moderatorNote: payload?.note ?? ""
      });

      if (!result.ok) {
        setError(result.error ?? "Không thể xử lý.");
        return;
      }

      setToast(result.message ?? "Đã lưu.");
      setModalOpen(false);
      setDrawerOpen(false);
      setSelected(null);
      router.refresh();
    });
  };

  const openModal = (item: ContentReviewQueueItem, action: ContentReviewActionKind) => {
    if (action === "approve") {
      runAction(item, "approve", { reasonCode: null, note: "" });
      return;
    }
    setModalTarget(item);
    setModalAction(action);
    setModalOpen(true);
  };

  const pendingCount = data.queue.filter((i) => i.status === "pending").length;

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
        <h1 className="text-3xl font-bold tracking-normal text-white">
          Kiểm duyệt nội dung
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
          Duyệt truyện, chương và nội dung cộng đồng trước khi hiển thị công khai.
        </p>
        <p className="text-xs text-zinc-500">
          Nội dung được duyệt sẽ xuất hiện công khai theo trạng thái xuất bản.
        </p>
      </header>

      {data.error ? (
        <ErrorState message={data.error} title="Không tải được hàng đợi" />
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {toast ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {toast}
        </p>
      ) : null}

      <ContentReviewSummaryCards
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

      {!showProcessed ? (
        <ContentReviewFilters
          collapsed={filtersCollapsed}
          filters={filters}
          genres={genres}
          onChange={(next) => setFilters((f) => ({ ...f, ...next }))}
          onToggleCollapse={() => setFiltersCollapsed((c) => !c)}
        />
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">
            {showProcessed ? "Đã xử lý gần đây" : "Hàng đợi kiểm duyệt"}
          </h2>
          {!showProcessed ? (
            <span className="text-sm text-zinc-500">{filteredQueue.length} mục</span>
          ) : null}
        </div>

        {showProcessed ? (
          <RecentlyReviewedList items={data.recentlyReviewed} />
        ) : filteredQueue.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
            <p className="font-medium text-zinc-300">Hàng đợi đang trống</p>
            <p className="mt-1 text-sm text-zinc-500">
              {pendingCount === 0
                ? "Không có nội dung nào đang chờ kiểm duyệt."
                : "Không có mục phù hợp bộ lọc hiện tại."}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filteredQueue.map((item) => (
              <li key={`${item.type}-${item.id}`}>
                <ContentReviewItemCard
                  disabled={pending}
                  item={item}
                  onApprove={() => openModal(item, "approve")}
                  onReject={() => openModal(item, "reject")}
                  onRequestChanges={() => openModal(item, "request_changes")}
                  onView={() => openDetail(item)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {!showProcessed ? (
        <section className="space-y-3 border-t border-white/10 pt-6">
          <h2 className="text-lg font-semibold text-white">Đã xử lý gần đây</h2>
          <RecentlyReviewedList items={data.recentlyReviewed} />
          <p className="text-xs text-zinc-600">
            Hôm nay: {data.summary.processedToday} đã xử lý ·{" "}
            {data.summary.rejectedToday} từ chối
          </p>
        </section>
      ) : null}

      <ContentReviewDetailDrawer
        actionDisabled={pending}
        detail={detail}
        loading={detailLoading}
        onApprove={() => selected && openModal(selected, "approve")}
        onClose={() => {
          setDrawerOpen(false);
          setSelected(null);
        }}
        onReject={() => selected && openModal(selected, "reject")}
        onRequestChanges={() => selected && openModal(selected, "request_changes")}
        onSendToQuality={
          selected?.type === "story"
            ? () => {
                if (!selected) return;
                startTransition(async () => {
                  const res = await sendToQualityReviewAction(
                    selected.id,
                    "Chuyển từ kiểm duyệt nội dung"
                  );
                  if (!res.ok) setError(res.error ?? "Không gửi được.");
                  else {
                    setToast("Đã gửi sang chất lượng nội dung.");
                    router.refresh();
                  }
                });
              }
            : undefined
        }
        open={drawerOpen}
      />

      <ContentReviewActionModal
        action={modalAction}
        loading={pending}
        onClose={() => setModalOpen(false)}
        onConfirm={(payload) => {
          if (modalTarget) runAction(modalTarget, modalAction, payload);
        }}
        open={modalOpen}
        title={
          modalAction === "reject"
            ? "Từ chối nội dung"
            : modalAction === "request_changes"
              ? "Yêu cầu chỉnh sửa"
              : "Xác nhận"
        }
      />
    </div>
  );
}
