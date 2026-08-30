"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { CommunityActionModal } from "@/components/admin/community/CommunityActionModal";
import { CommunityAuthorGroupsAdmin } from "@/components/admin/community/CommunityAuthorGroupsAdmin";
import { CommunityDetailDrawer } from "@/components/admin/community/CommunityDetailDrawer";
import {
  CommunityFilters,
  defaultCommunityFilters,
  type CommunityFilterState
} from "@/components/admin/community/CommunityFilters";
import { CommunityPostCard } from "@/components/admin/community/CommunityPostCard";
import { CommunityRecentlyHandled } from "@/components/admin/community/CommunityRecentlyHandled";
import { CommunitySettingsPanel } from "@/components/admin/community/CommunitySettingsPanel";
import { CommunityStoryGroupsAdmin } from "@/components/admin/community/CommunityStoryGroupsAdmin";
import { CommunitySummaryCards } from "@/components/admin/community/CommunitySummaryCards";
import { Badge, Button, ErrorState } from "@/components/ui";
import { hideCommunityCommentAction, communityPostAction, restoreCommunityCommentAction } from "@/lib/admin/community-post-actions";
import { getCommunityPostDetail } from "@/lib/admin/get-community-post-detail";
import type {
  CommunityAdminPageData,
  CommunityAdminTab,
  CommunityPostActionKind,
  CommunityQueueItem
} from "@/types/community-admin";

const MAIN_TABS: Array<{ id: CommunityAdminTab; label: string }> = [
  { id: "overview", label: "Tổng quan" },
  { id: "posts", label: "Bài viết" },
  { id: "comments", label: "Bình luận" },
  { id: "polls", label: "Poll" },
  { id: "challenges", label: "Challenge" },
  { id: "story_groups", label: "Nhóm truyện" },
  { id: "author_groups", label: "Nhóm tác giả" },
  { id: "processed", label: "Đã xử lý" }
];

const POST_STATUS_TABS = [
  { id: "pending", label: "Chờ duyệt" },
  { id: "rejected", label: "Đã từ chối" },
  { id: "hidden", label: "Đã ẩn" }
] as const;

type AdminCommunityPageProps = {
  data: CommunityAdminPageData;
};

function withinDateRange(createdAt: string, range: CommunityFilterState["dateRange"]) {
  if (range === "all") return true;
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const day = 86_400_000;
  if (range === "today") return now - created < day;
  if (range === "7d") return now - created < 7 * day;
  if (range === "30d") return now - created < 30 * day;
  return true;
}

function matchesFilters(post: CommunityQueueItem, filters: CommunityFilterState) {
  const q = filters.search.trim().toLowerCase();
  if (filters.contentType !== "all" && post.type !== filters.contentType) return false;
  if (filters.status === "reported") {
    if (post.reportCount < 1) return false;
  } else if (filters.status !== "all" && post.status !== filters.status) {
    return false;
  }
  if (filters.risk !== "all" && post.riskLevel !== filters.risk) return false;
  if (!withinDateRange(post.createdAt, filters.dateRange)) return false;

  if (filters.attachment === "story" && !post.storyTitle) return false;
  if (filters.attachment === "episode" && !post.episodeLabel) return false;
  if (filters.attachment === "author" && !post.studioName) return false;
  if (filters.attachment === "story_group" && !post.storyTitle) return false;
  if (filters.attachment === "none" && (post.storyTitle || post.studioName)) return false;

  if (filters.posterType === "studio" && post.authorRole !== "studio") return false;
  if (filters.posterType === "reader" && post.authorRole !== "reader") return false;

  if (q) {
    const hay = `${post.title} ${post.id} ${post.authorName ?? ""} ${post.authorUsername ?? ""} ${post.storyTitle ?? ""}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }

  return true;
}

export function AdminCommunityPage({ data }: AdminCommunityPageProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<CommunityAdminTab>("overview");
  const [postStatusTab, setPostStatusTab] = useState<"pending" | "rejected" | "hidden">("pending");
  const [filters, setFilters] = useState<CommunityFilterState>(defaultCommunityFilters);
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const [cardFilter, setCardFilter] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(data.error);

  const [selected, setSelected] = useState<CommunityQueueItem | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getCommunityPostDetail>>["detail"]>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<CommunityPostActionKind>("reject");
  const [modalTarget, setModalTarget] = useState<CommunityQueueItem | null>(null);

  const effectiveTab = useMemo(() => {
    if (cardFilter === "pending_posts") return "posts";
    if (cardFilter === "comments") return "comments";
    if (cardFilter === "polls") return "polls";
    if (cardFilter === "challenges") return "challenges";
    if (cardFilter === "story_groups") return "story_groups";
    if (cardFilter === "reported_posts") return "posts";
    if (cardFilter === "processed") return "processed";
    return tab;
  }, [cardFilter, tab]);

  const filteredQueue = useMemo(() => {
    let list = data.queue;

    if (effectiveTab === "posts" || cardFilter === "pending_posts") {
      list = list.filter((p) => p.status === postStatusTab);
    }
    if (cardFilter === "reported_posts") {
      list = list.filter((p) => p.reportCount > 0);
    }
    if (cardFilter === "hidden_today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      list = list.filter(
        (p) => p.status === "hidden" && new Date(p.createdAt) >= today
      );
    }
    if (cardFilter === "pending_posts") {
      list = list.filter((p) => p.status === "pending");
    }

    return list.filter((p) => matchesFilters(p, filters));
  }, [data.queue, effectiveTab, filters, postStatusTab, cardFilter]);

  const runAction = useCallback(
    (input: Parameters<typeof communityPostAction>[0], overrideReason?: string) => {
      startTransition(async () => {
        const res = await communityPostAction({
          ...input,
          overrideReason: overrideReason ?? input.overrideReason
        });
        if (res.ok) {
          setToast("Đã cập nhật.");
          setDrawerOpen(false);
          setModalOpen(false);
          router.refresh();
        } else {
          setToast(res.error ?? "Lỗi thao tác.");
        }
      });
    },
    [router]
  );

  const openDetail = useCallback(async (post: CommunityQueueItem) => {
    setSelected(post);
    setDrawerOpen(true);
    setDetailLoading(true);
    const res = await getCommunityPostDetail(post.id);
    setDetail(res.detail);
    setDetailLoading(false);
  }, []);

  const openModal = (post: CommunityQueueItem, action: CommunityPostActionKind) => {
    setModalTarget(post);
    setModalAction(action);
    setModalOpen(true);
  };

  const actionDisabled = pending || !data.permissions.canModeratePosts;

  const emptyQueue =
    (effectiveTab === "overview" || effectiveTab === "posts") &&
    filteredQueue.length === 0 &&
    !loadError;

  return (
    <section className="mx-auto max-w-[1320px] space-y-6">
      <div>
        <Link
          className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          href="/admin"
        >
          ← Quay lại Admin
        </Link>
        <p className="mt-5 text-sm font-medium uppercase tracking-wide text-cyan-300">
          ChapMee Admin
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal text-white">
          Quản trị cộng đồng
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
          Quản lý bài viết, bình luận, poll, challenge và nhóm thảo luận quanh
          truyện/tác giả.
        </p>
        <Link
          className="mt-4 inline-flex text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          href="/admin/community/auto-moderation"
        >
          Cấu hình duyệt tự động →
        </Link>
        <Link
          className="mt-2 block text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          href="/admin/community/story-sync"
        >
          Đồng bộ nhóm truyện (Story Community Sync) →
        </Link>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-200">
            Không tải được dữ liệu cộng đồng. Vui lòng thử lại.
          </p>
          <Button
            className="mt-3"
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
        <p className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
          {toast}
        </p>
      ) : null}

      <CommunitySummaryCards
        activeFilter={cardFilter}
        onFilter={setCardFilter}
        summary={data.summary}
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {MAIN_TABS.map((t) => (
          <button
            className={`inline-flex min-h-10 shrink-0 items-center rounded-lg border px-4 py-2 text-sm font-semibold transition ${
              effectiveTab === t.id
                ? "border-cyan-300 bg-cyan-300 text-zinc-950"
                : "border-zinc-800 bg-zinc-900 text-zinc-200 hover:border-cyan-300/60"
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

      {(effectiveTab === "overview" || effectiveTab === "posts") && (
        <CommunityFilters
          collapsed={filtersCollapsed}
          filters={filters}
          onChange={setFilters}
          onToggleCollapse={() => setFiltersCollapsed((v) => !v)}
        />
      )}

      {(effectiveTab === "overview" || effectiveTab === "posts") && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-white">Hàng đợi cộng đồng</h2>
            <p className="text-xs text-zinc-500">Bài cộng đồng</p>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {POST_STATUS_TABS.map((st) => (
              <button
                className={`inline-flex min-h-9 shrink-0 items-center rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  postStatusTab === st.id
                    ? "border-cyan-300/80 bg-cyan-500/20 text-cyan-100"
                    : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
                }`}
                key={st.id}
                onClick={() => setPostStatusTab(st.id)}
                type="button"
              >
                {st.label}
              </button>
            ))}
          </div>

          {emptyQueue ? (
            <div className="rounded-xl border border-white/10 bg-zinc-900/30 px-4 py-6 text-center">
              <p className="text-sm font-medium text-zinc-300">
                Không có nội dung cần xử lý
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                Nội dung cộng đồng chờ duyệt, bị report hoặc bị ẩn sẽ xuất hiện tại
                đây.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQueue.map((post) => (
                <CommunityPostCard
                  disabled={actionDisabled}
                  key={post.id}
                  onApprove={() =>
                    runAction(
                      { postId: post.id, action: "approve" },
                      post.autoDecision ? "Moderator override — duyệt thủ công" : undefined
                    )
                  }
                  onFeature={() =>
                    runAction({
                      postId: post.id,
                      action: post.isFeatured ? "unfeature" : "feature"
                    })
                  }
                  onHide={() => openModal(post, "hide")}
                  onPin={() =>
                    runAction({
                      postId: post.id,
                      action: post.isPinned ? "unpin" : "pin",
                      pinnedScope: "story"
                    })
                  }
                  onReject={() => openModal(post, "reject")}
                  onView={() => openDetail(post)}
                  permissions={data.permissions}
                  post={post}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {effectiveTab === "comments" && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Bình luận cộng đồng</h2>
          {!data.comments.length ? (
            <p className="text-sm text-zinc-500">Không có bình luận cần xử lý.</p>
          ) : (
            <ul className="space-y-3">
              {data.comments
                .filter((c) =>
                  filters.search
                    ? c.body.toLowerCase().includes(filters.search.toLowerCase())
                    : true
                )
                .map((c) => (
                  <li
                    className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"
                    key={c.id}
                  >
                    <p className="line-clamp-3 text-sm text-zinc-300">{c.body}</p>
                    <p className="mt-2 text-xs text-zinc-500">
                      {c.authorName ?? "—"}
                      {c.postTitle ? ` · ${c.postTitle}` : ""}
                      {c.storyTitle ? ` · ${c.storyTitle}` : ""} · {c.reportCount}{" "}
                      report · {c.status}
                    </p>
                    {data.permissions.canModeratePosts ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          disabled={actionDisabled}
                          onClick={() =>
                            startTransition(async () => {
                              await hideCommunityCommentAction(c.id);
                              router.refresh();
                            })
                          }
                          type="button"
                          variant="ghost"
                        >
                          Ẩn comment
                        </Button>
                        <Button
                          disabled={actionDisabled}
                          onClick={() =>
                            startTransition(async () => {
                              await restoreCommunityCommentAction(c.id);
                              router.refresh();
                            })
                          }
                          type="button"
                          variant="ghost"
                        >
                          Khôi phục
                        </Button>
                      </div>
                    ) : null}
                  </li>
                ))}
            </ul>
          )}
        </section>
      )}

      {effectiveTab === "polls" && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Poll</h2>
          {!data.polls.length ? (
            <p className="text-sm text-zinc-500">Không có poll cần quản lý.</p>
          ) : (
            <ul className="space-y-2">
              {data.polls.map((p) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 px-4 py-3"
                  key={`${p.source}-${p.id}`}
                >
                  <div>
                    <p className="font-medium text-white">{p.title}</p>
                    <p className="text-xs text-zinc-500">
                      {p.storyTitle ?? "—"} · {p.status} · {p.reportCount} report
                    </p>
                  </div>
                  <Badge>{p.source === "polls_table" ? "Poll truyện" : "Bài poll"}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {effectiveTab === "challenges" && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Challenge</h2>
          {!data.challenges.length ? (
            <p className="text-sm text-zinc-500">Không có challenge cần quản lý.</p>
          ) : (
            <ul className="space-y-2">
              {data.challenges.map((c) => (
                <li
                  className="rounded-lg border border-white/10 px-4 py-3"
                  key={`${c.source}-${c.id}`}
                >
                  <p className="font-medium text-white">{c.title}</p>
                  <p className="text-xs text-zinc-500">
                    {c.status} · {c.reportCount} report
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {effectiveTab === "story_groups" && (
        <CommunityStoryGroupsAdmin
          disabled={pending}
          groups={data.storyGroups}
          onRefresh={() => router.refresh()}
          permissions={data.permissions}
        />
      )}

      {effectiveTab === "author_groups" && (
        <CommunityAuthorGroupsAdmin
          disabled={pending}
          groups={data.authorGroups}
          onRefresh={() => router.refresh()}
          permissions={data.permissions}
        />
      )}

      {(effectiveTab === "overview" || effectiveTab === "processed") && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Đã xử lý gần đây</h2>
          <CommunityRecentlyHandled items={data.recentlyHandled} />
        </section>
      )}

      {(effectiveTab === "overview" || effectiveTab === "processed") && (
        <CommunitySettingsPanel
          permissions={data.permissions}
          settings={data.spamSettings}
        />
      )}

      {!data.permissions.canModeratePosts && data.permissions.canView ? (
        <ErrorState
          message="Tài khoản của bạn chỉ có quyền xem. Liên hệ admin nếu cần quyền kiểm duyệt."
          title="Chế độ chỉ xem"
          variant="warning"
        />
      ) : null}

      <CommunityDetailDrawer
        actionDisabled={actionDisabled}
        detail={detail}
        loading={detailLoading}
        onApprove={() =>
          selected && runAction({ postId: selected.id, action: "approve" })
        }
        onClose={() => setDrawerOpen(false)}
        onFeature={() =>
          selected &&
          runAction({
            postId: selected.id,
            action: selected.isFeatured ? "unfeature" : "feature"
          })
        }
        onHide={() => selected && openModal(selected, "hide")}
        onLockComments={() =>
          selected &&
          runAction({
            postId: selected.id,
            action: selected.commentsLocked ? "unlock_comments" : "lock_comments"
          })
        }
        onPin={() =>
          selected &&
          runAction({
            postId: selected.id,
            action: selected.isPinned ? "unpin" : "pin",
            pinnedScope: "story"
          })
        }
        onReject={() => selected && openModal(selected, "reject")}
        open={drawerOpen}
        permissions={data.permissions}
      />

      <CommunityActionModal
        action={modalAction}
        loading={pending}
        onClose={() => setModalOpen(false)}
        onConfirm={({ reasonCode, note, hiddenReason }) => {
          if (!modalTarget) return;
          runAction({
            postId: modalTarget.id,
            action: modalAction,
            reasonCode: reasonCode ?? undefined,
            note,
            hiddenReason
          });
        }}
        open={modalOpen}
        title={modalAction === "reject" ? "Từ chối bài viết" : "Ẩn bài viết"}
      />
    </section>
  );
}
