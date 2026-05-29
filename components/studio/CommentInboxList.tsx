"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AvatarFallback } from "@/components/ui/AvatarFallback";
import { CommentReplyBox } from "@/components/studio/CommentReplyBox";
import { StudioRowActionMenu } from "@/components/studio/StudioRowActionMenu";
import { EmptyState } from "@/components/ui";
import { formatRelativeTime } from "@/lib/notifications/format-relative-time";
import {
  studioHideCommentAction,
  studioPinCommentAction,
  studioReportCommentAction
} from "@/lib/studio/studio-comments-actions";
import type {
  StudioCommentFilter,
  StudioCommentInboxItem,
  StudioCommentInboxStatus,
  StudioCommentStoryOption
} from "@/types/comments";

const FILTER_TABS: { id: StudioCommentFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "unreplied", label: "Chưa trả lời" },
  { id: "replied", label: "Đã trả lời" },
  { id: "pinned", label: "Được ghim" },
  { id: "reported", label: "Bị báo cáo" },
  { id: "hidden", label: "Đã ẩn" }
];

const STATUS_LABELS: Record<StudioCommentInboxStatus, string> = {
  new: "Mới",
  replied: "Đã trả lời",
  hidden: "Đã ẩn",
  reported: "Bị báo cáo"
};

const STATUS_CLASSES: Record<StudioCommentInboxStatus, string> = {
  new: "bg-sky-400/15 text-sky-200",
  replied: "bg-emerald-400/15 text-emerald-200",
  hidden: "bg-zinc-500/20 text-zinc-400",
  reported: "bg-amber-400/15 text-amber-200"
};

type CommentInboxListProps = {
  comments: StudioCommentInboxItem[];
  stories: StudioCommentStoryOption[];
  activeFilter: StudioCommentFilter;
  activeStoryId?: string;
  searchQuery?: string;
};

function buildHref(
  pathname: string,
  params: Record<string, string | undefined>
) {
  const next = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      next.set(key, value);
    }
  }

  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function CommentInboxList({
  comments,
  stories,
  activeFilter,
  activeStoryId,
  searchQuery = ""
}: CommentInboxListProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(comments[0]?.id ?? null);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const selected = useMemo(
    () => comments.find((item) => item.id === selectedId) ?? null,
    [comments, selectedId]
  );

  function updateParams(patch: Record<string, string | undefined>) {
    const href = buildHref(pathname, {
      filter: patch.filter ?? activeFilter,
      story: patch.story ?? activeStoryId,
      q: patch.q ?? (patch.q === "" ? undefined : searchQuery || undefined)
    });
    router.push(href);
  }

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    updateParams({ q: localSearch.trim() || undefined });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTER_TABS.map((tab) => {
            const active = tab.id === activeFilter;
            return (
              <Link
                className={`inline-flex min-h-10 items-center rounded-full border px-3 text-sm font-semibold transition ${
                  active
                    ? "border-sky-300 bg-sky-300 text-zinc-950"
                    : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/20"
                }`}
                href={buildHref(pathname, {
                  filter: tab.id,
                  story: activeStoryId,
                  q: searchQuery || undefined
                })}
                key={tab.id}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="studio-comment-story">
            Lọc theo truyện
          </label>
          <select
            className="min-h-10 rounded-xl border border-white/10 bg-zinc-900 px-3 text-sm text-zinc-100"
            id="studio-comment-story"
            onChange={(event) =>
              updateParams({
                story: event.target.value || undefined,
                filter: activeFilter
              })
            }
            value={activeStoryId ?? ""}
          >
            <option value="">Tất cả truyện</option>
            {stories.map((story) => (
              <option key={story.id} value={story.id}>
                {story.title}
              </option>
            ))}
          </select>

          <form className="min-w-0 flex-1 sm:min-w-[14rem]" onSubmit={handleSearchSubmit}>
            <input
              className="w-full min-h-10 rounded-xl border border-white/10 bg-zinc-900 px-3 text-sm text-zinc-100 placeholder:text-zinc-500"
              onChange={(event) => setLocalSearch(event.target.value)}
              placeholder="Tìm bình luận..."
              type="search"
              value={localSearch}
            />
          </form>
        </div>
      </div>

      {comments.length === 0 ? (
        <EmptyState
          description="Khi độc giả bình luận trên truyện hoặc chương của bạn, họ sẽ xuất hiện tại đây."
          title="Chưa có bình luận phù hợp."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <ul className="space-y-2">
            {comments.map((item) => {
              const isActive = item.id === selectedId;

              return (
                <li key={item.id}>
                  <button
                    className={`w-full rounded-2xl border p-3 text-left transition sm:p-4 ${
                      isActive
                        ? "border-sky-400/40 bg-sky-400/10"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20"
                    }`}
                    onClick={() => setSelectedId(item.id)}
                    type="button"
                  >
                    <CommentInboxCard
                      compact
                      item={item}
                      menu={
                        <StudioRowActionMenu
                          ariaLabel="Tùy chọn bình luận"
                          items={buildMenuItems(item)}
                        />
                      }
                    />
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="hidden rounded-2xl border border-white/10 bg-zinc-950/80 p-4 lg:block lg:p-5">
            {selected ? (
              <CommentDetailPanel item={selected} />
            ) : (
              <p className="text-sm text-zinc-500">Chọn một bình luận để xem chi tiết.</p>
            )}
          </div>
        </div>
      )}

      {selected ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 lg:hidden">
          <CommentDetailPanel item={selected} />
        </div>
      ) : null}
    </div>
  );
}

function buildMenuItems(item: StudioCommentInboxItem) {
  return [
    {
      type: "link" as const,
      label: "Mở ngữ cảnh",
      href: item.contextHref
    },
    {
      type: "action" as const,
      label: item.isPinned ? "Bỏ ghim" : "Ghim",
      onAction: () => studioPinCommentAction(item.id, !item.isPinned)
    },
    ...(item.isHidden
      ? []
      : [
          {
            type: "action" as const,
            label: "Ẩn",
            destructive: true,
            confirmMessage: "Ẩn bình luận này? Độc giả sẽ không thấy trên trang công khai.",
            onAction: () => studioHideCommentAction(item.id)
          }
        ]),
    {
      type: "action" as const,
      label: "Báo cáo",
      confirmMessage: "Gửi báo cáo vi phạm nặng tới đội moder ChapMee?",
      onAction: () => studioReportCommentAction(item.id, "other")
    }
  ];
}

function CommentInboxCard({
  item,
  menu,
  compact = false
}: {
  item: StudioCommentInboxItem;
  menu?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <AvatarFallback
        name={item.authorDisplayName ?? "Độc giả"}
        size="sm"
        src={item.authorAvatarUrl}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-100">
              {item.authorDisplayName}
            </p>
            <p className="mt-0.5 truncate text-xs text-zinc-500">
              {item.source === "community_post" ? (
                <span className="text-violet-300">Bài cộng đồng · </span>
              ) : null}
              {item.contextLabel}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_CLASSES[item.status]}`}
            >
              {STATUS_LABELS[item.status]}
            </span>
            {menu}
          </div>
        </div>
        <p className={`mt-2 text-sm text-zinc-200 ${compact ? "line-clamp-2" : ""}`}>
          {item.content}
        </p>
        <p className="mt-2 text-xs text-zinc-500">{formatRelativeTime(item.createdAt)}</p>
      </div>
    </div>
  );
}

function CommentDetailPanel({ item }: { item: StudioCommentInboxItem }) {
  return (
    <div className="space-y-4">
      <CommentInboxCard
        item={item}
        menu={<StudioRowActionMenu ariaLabel="Tùy chọn" items={buildMenuItems(item)} />}
      />

      <div className="flex flex-wrap gap-2">
        <Link
          className="inline-flex min-h-10 items-center rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-semibold text-zinc-200 hover:bg-white/10"
          href={item.contextHref}
          target="_blank"
        >
          Mở ngữ cảnh
        </Link>
        {item.isPinned ? (
          <span className="inline-flex items-center rounded-full bg-amber-400/15 px-2 py-1 text-xs font-semibold text-amber-200">
            Đã ghim
          </span>
        ) : null}
      </div>

      {item.isHidden ? (
        <p className="text-sm text-zinc-500">Bình luận đã ẩn — không thể trả lời.</p>
      ) : (
        <CommentReplyBox commentId={item.id} />
      )}
    </div>
  );
}
