"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChapterFormatBadge } from "@/components/studio/presentation/ChapterFormatBadge";
import { ComposerValidationBadge } from "@/components/studio/presentation/ComposerValidationBadge";
import { StudioManagerTabs } from "@/components/studio/StudioManagerTabs";
import { StudioPagination } from "@/components/studio/StudioPagination";
import { StudioRowActionMenu } from "@/components/studio/StudioRowActionMenu";
import { StudioStatusBadge } from "@/components/studio/StudioStatusBadge";
import { EmptyState } from "@/components/ui";
import {
  batchDeleteDraftChaptersAction,
  batchHideStudioChaptersAction,
  batchMoveChaptersToDraftAction,
  batchPublishStudioChaptersAction,
  batchSetChaptersFreeAction,
  exportChaptersCsvAction
} from "@/lib/studio/chapter-manager-actions";
import { downloadTextFile } from "@/lib/studio/csv";
import {
  deleteDraftStudioChapterAction,
  hideStudioChapterAction
} from "@/lib/studio/manager-actions";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import { studioPath } from "@/lib/studio/constants";
import { copyToClipboard, COPY_FEEDBACK_MS } from "@/lib/utilities/copy-to-clipboard";
import { getStoryChapterHref } from "@/lib/stories/story-routes";
import type {
  StudioChapter,
  StudioChapterManagerStats,
  StudioStoryHeader
} from "@/lib/studio/get-studio-chapters";
import type { StudioChapterListFilter } from "@/types/studio";
import { STUDIO_CHAPTER_PAGE_SIZES } from "@/types/studio";

const CHAPTER_TABS: Array<{ label: string; value: StudioChapterListFilter }> = [
  { label: "Tất cả", value: "all" },
  { label: "Nháp", value: "draft" },
  { label: "Lên lịch", value: "scheduled" },
  { label: "Đã đăng", value: "published" },
  { label: "Cần sửa", value: "rejected" },
  { label: "Đã ẩn", value: "hidden" },
  { label: "Có bình luận", value: "has_comments" },
  { label: "Trả phí", value: "paid" },
  { label: "Miễn phí", value: "free" }
];

type ChapterManagerWorkspaceProps = {
  activeFilter: StudioChapterListFilter;
  activeSort: string;
  basePath: string;
  chapters: StudioChapter[];
  counts: Record<StudioChapterListFilter, number>;
  hasActiveFilters: boolean;
  page: number;
  pageSize: number;
  query: Record<string, string | undefined>;
  search: string;
  stats: StudioChapterManagerStats | null;
  story: StudioStoryHeader;
  storyId: string;
  totalPages: number;
};

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  }).format(new Date(value));
}

function formatCount(value: number | null) {
  if (value === null) {
    return "—";
  }

  return new Intl.NumberFormat("vi-VN").format(value);
}

function SeoStatusBadge({ status }: { status: StudioChapter["seoStatus"] }) {
  const map = {
    missing: "bg-rose-500/15 text-rose-200",
    ok: "bg-emerald-500/15 text-emerald-200",
    warning: "bg-amber-500/15 text-amber-200"
  };
  const label = {
    missing: "Thiếu SEO",
    ok: "SEO đạt",
    warning: "SEO cần xem"
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${map[status]}`}>
      {label[status]}
    </span>
  );
}

function MonetizationBadge({ chapter }: { chapter: StudioChapter }) {
  if (chapter.isPaid) {
    return (
      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-100">
        {chapter.coinPrice ? `${chapter.coinPrice} coin` : "Trả phí"}
      </span>
    );
  }

  return (
    <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-100">
      Miễn phí
    </span>
  );
}

function ChapterCodeCell({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      className="max-w-[7rem] truncate font-mono text-xs text-cyan-200/90 hover:text-cyan-100"
      onClick={() => {
        void copyToClipboard(code).then((ok) => {
          if (!ok) return;
          setCopied(true);
          window.setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
        });
      }}
      title={copied ? "Đã sao chép chapter_code" : `Sao chép: ${code}`}
      type="button"
    >
      {copied ? "Đã chép" : code}
    </button>
  );
}

function ChapterRowActions({
  chapter,
  onChanged,
  storyId,
  storyPublicCode,
  storySlug
}: {
  chapter: StudioChapter;
  onChanged: () => void;
  storyId: string;
  storyPublicCode: string;
  storySlug: string;
}) {
  const editHref = studioPath(`/stories/${storyId}/chapters/${chapter.id}/edit`);
  const previewHref = `${editHref}?preview=1`;
  const publicHref = getStoryChapterHref(
    { public_code: storyPublicCode, slug: storySlug },
    { public_code: chapter.publicCode, slug: chapter.slug }
  );
  const canPublic = chapter.status === "published" || chapter.status === "approved";
  const canDeleteDraft = chapter.status === "draft";

  return (
    <StudioRowActionMenu
      ariaLabel={`Tùy chọn chương ${chapter.episodeNumber}`}
      preferOpenUpward
      items={[
        { href: editHref, label: "Sửa", type: "link" },
        { href: previewHref, label: "Xem trước", type: "link" },
        ...(canPublic
          ? [{ href: publicHref, label: "Xem trang công khai", type: "link" as const }]
          : []),
        { href: `${editHref}#lich-dang`, label: "Lên lịch", type: "link" },
        { href: `${editHref}#seo`, label: "Cấu hình SEO", type: "link" },
        {
          href: studioPath(`/monetization?story=${storyId}&chapter=${chapter.id}`),
          label: "Cấu hình trả phí",
          type: "link"
        },
        {
          label: "Ẩn chương",
          onAction: async () => {
            const result = await hideStudioChapterAction(storyId, chapter.id);
            onChanged();
            return result;
          },
          type: "action"
        },
        ...(canDeleteDraft
          ? [
              {
                confirmMessage: "Xóa vĩnh viễn chương nháp này?",
                destructive: true,
                label: "Xóa nháp",
                onAction: async () => {
                  const result = await deleteDraftStudioChapterAction(storyId, chapter.id);
                  onChanged();
                  return result;
                },
                type: "action" as const
              }
            ]
          : [])
      ]}
    />
  );
}

export function ChapterManagerWorkspace({
  activeFilter,
  activeSort,
  basePath,
  chapters,
  counts,
  hasActiveFilters,
  page,
  pageSize,
  query,
  search,
  stats,
  story,
  storyId,
  totalPages
}: ChapterManagerWorkspaceProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchMessage, setBatchMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const allSelected = chapters.length > 0 && chapters.every((chapter) => selected.has(chapter.id));
  const selectedIds = useMemo(() => [...selected], [selected]);

  function refresh() {
    router.refresh();
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
      return;
    }

    setSelected(new Set(chapters.map((chapter) => chapter.id)));
  }

  function toggleOne(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function runBatch(action: "hide" | "draft" | "publish" | "delete" | "free" | "export") {
    if (action === "export") {
      startTransition(async () => {
        const result = await exportChaptersCsvAction(storyId);
        if (!result.ok || !result.csv) {
          setBatchMessage(result.error ?? "Không xuất được CSV.");
          return;
        }
        downloadTextFile(result.csv, `chapters-${story.slug}.csv`);
      });
      return;
    }

    if (selectedIds.length === 0) {
      setBatchMessage("Chọn ít nhất một chương.");
      return;
    }

    const confirmed = window.confirm(
      `Thực hiện thao tác với ${selectedIds.length} chương đã chọn?`
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result =
        action === "hide"
          ? await batchHideStudioChaptersAction(storyId, selectedIds)
          : action === "draft"
            ? await batchMoveChaptersToDraftAction(storyId, selectedIds)
            : action === "publish"
              ? await batchPublishStudioChaptersAction(storyId, selectedIds)
              : action === "free"
                ? await batchSetChaptersFreeAction(storyId, selectedIds)
                : await batchDeleteDraftChaptersAction(storyId, selectedIds);

      if (result.skipped.length > 0) {
        setBatchMessage(
          `Hoàn tất ${result.successCount} chương. Bỏ qua ${result.skipped.length}: ${result.skipped[0]?.reason ?? ""}`
        );
      } else if (result.error) {
        setBatchMessage(result.error);
      } else {
        setBatchMessage(`Đã xử lý ${result.successCount} chương.`);
      }

      setSelected(new Set());
      refresh();
    });
  }

  return (
    <div className="space-y-4">
      <form
        action={basePath}
        className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 lg:grid-cols-[minmax(0,1fr)_10rem_8rem_auto]"
        method="get"
      >
        <label className="block space-y-2 text-sm">
          <span className="font-semibold text-zinc-200">Tìm kiếm</span>
          <input
            className="min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100"
            defaultValue={search}
            name="q"
            placeholder="Số chương, tiêu đề..."
          />
        </label>
        <label className="block space-y-2 text-sm">
          <span className="font-semibold text-zinc-200">Sắp xếp</span>
          <select
            className="min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100"
            defaultValue={activeSort}
            name="sort"
          >
            <option value="number_asc">Số chương ↑</option>
            <option value="number_desc">Số chương ↓</option>
            <option value="updated">Mới cập nhật</option>
            <option value="published">Ngày đăng</option>
            <option value="reads">Lượt đọc</option>
            <option value="comments">Bình luận</option>
          </select>
        </label>
        <label className="block space-y-2 text-sm">
          <span className="font-semibold text-zinc-200">Mỗi trang</span>
          <select
            className="min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100"
            defaultValue={String(pageSize)}
            name="pageSize"
          >
            {STUDIO_CHAPTER_PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          {activeFilter !== "all" ? (
            <input name="status" type="hidden" value={activeFilter} />
          ) : null}
          <button
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-cyan-400 px-4 text-sm font-semibold text-zinc-950"
            type="submit"
          >
            Áp dụng
          </button>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-3 text-sm font-semibold text-zinc-300"
            href={basePath}
          >
            Xóa lọc
          </Link>
        </div>
      </form>

      <StudioManagerTabs
        active={activeFilter}
        basePath={basePath}
        counts={counts}
        query={{ ...query, pageSize: String(pageSize) }}
        tabs={CHAPTER_TABS}
      />

      {stats?.orderDiagnostics.hasIssues ? (
        <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Cảnh báo thứ tự:{" "}
          {stats.orderDiagnostics.duplicateNumbers.length > 0
            ? `trùng số ${stats.orderDiagnostics.duplicateNumbers.join(", ")}`
            : null}
          {stats.orderDiagnostics.missingNumbers.length > 0
            ? ` thiếu số ${stats.orderDiagnostics.missingNumbers.slice(0, 8).join(", ")}${stats.orderDiagnostics.missingNumbers.length > 8 ? "…" : ""}`
            : null}
        </p>
      ) : null}

      {batchMessage ? (
        <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-300">
          {batchMessage}
        </p>
      ) : null}

      {selectedIds.length > 0 ? (
        <div className="sticky bottom-20 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-cyan-400/30 bg-[#070b12]/95 p-3 shadow-lg backdrop-blur-md lg:bottom-4">
          <span className="text-sm font-semibold text-cyan-100">
            Đã chọn {selectedIds.length} chương
          </span>
          <button
            className="rounded-lg bg-cyan-400 px-3 py-1.5 text-xs font-semibold text-zinc-950"
            disabled={pending}
            onClick={() => runBatch("publish")}
            type="button"
          >
            Đăng
          </button>
          <button
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-200"
            disabled={pending}
            onClick={() => runBatch("hide")}
            type="button"
          >
            Ẩn
          </button>
          <button
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-200"
            disabled={pending}
            onClick={() => runBatch("draft")}
            type="button"
          >
            Chuyển nháp
          </button>
          <button
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-200"
            disabled={pending}
            onClick={() => runBatch("free")}
            type="button"
          >
            Miễn phí
          </button>
          <button
            className="rounded-lg border border-rose-400/30 px-3 py-1.5 text-xs font-semibold text-rose-200"
            disabled={pending}
            onClick={() => runBatch("delete")}
            type="button"
          >
            Xóa nháp
          </button>
          <button
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-200"
            disabled={pending}
            onClick={() => runBatch("export")}
            type="button"
          >
            Xuất CSV
          </button>
        </div>
      ) : null}

      {chapters.length === 0 ? (
        <EmptyState
          action={
            hasActiveFilters ? (
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-semibold text-zinc-200"
                href={basePath}
              >
                Xóa bộ lọc
              </Link>
            ) : (
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-cyan-400 px-4 text-sm font-semibold text-zinc-950"
                href={studioPath(`/stories/${storyId}/chapters/new`)}
              >
                Viết chương đầu
              </Link>
            )
          }
          description={
            hasActiveFilters
              ? "Thử đổi từ khóa hoặc bộ lọc khác."
              : "Hãy viết chương đầu hoặc nhập hàng loạt để bắt đầu."
          }
          title={hasActiveFilters ? "Không có chương phù hợp" : "Truyện chưa có chương"}
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto overflow-y-visible rounded-2xl border border-white/10 lg:block">
            <table className="min-w-full text-sm">
              <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-3 py-3">
                    <input
                      aria-label="Chọn tất cả"
                      checked={allSelected}
                      onChange={toggleAll}
                      type="checkbox"
                    />
                  </th>
                  <th className="px-3 py-3">#</th>
                  <th className="px-3 py-3">Mã chương</th>
                  <th className="px-3 py-3">Tiêu đề</th>
                  <th className="px-3 py-3">Trạng thái</th>
                  <th className="px-3 py-3">Loại</th>
                  <th className="px-3 py-3">Từ / Đọc</th>
                  <th className="px-3 py-3">Tương tác</th>
                  <th className="px-3 py-3">Kiếm tiền</th>
                  <th className="px-3 py-3">SEO</th>
                  <th className="px-3 py-3">Thời gian</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {chapters.map((chapter) => (
                  <tr
                    className="border-t border-white/5 transition hover:bg-white/[0.02]"
                    key={chapter.id}
                  >
                    <td className="px-3 py-3">
                      <input
                        checked={selected.has(chapter.id)}
                        onChange={() => toggleOne(chapter.id)}
                        type="checkbox"
                      />
                    </td>
                    <td className="px-3 py-3 font-semibold text-zinc-300">
                      {chapter.episodeNumber}
                    </td>
                    <td className="px-3 py-3">
                      <ChapterCodeCell code={chapter.publicCode} />
                    </td>
                    <td className="max-w-xs px-3 py-3">
                      <Link
                        className="line-clamp-2 font-semibold text-white hover:text-cyan-200"
                        href={studioPath(
                          `/stories/${storyId}/chapters/${chapter.id}/edit`
                        )}
                      >
                        {chapter.title}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <StudioStatusBadge kind="chapter" status={chapter.displayStatus} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        <ChapterFormatBadge contentFormat={chapter.contentFormat} />
                        {chapter.contentFormat === "structured_blocks" ? (
                          <ComposerValidationBadge status={chapter.validationStatus} />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-zinc-400">
                      {formatCount(chapter.wordCount)} từ
                      {chapter.readingMinutes ? ` · ~${chapter.readingMinutes}p` : ""}
                    </td>
                    <td className="px-3 py-3 text-zinc-400">
                      {formatCount(chapter.readCount)} đọc
                      {chapter.commentCount ? ` · ${formatCount(chapter.commentCount)} cmt` : ""}
                    </td>
                    <td className="px-3 py-3">
                      <MonetizationBadge chapter={chapter} />
                    </td>
                    <td className="px-3 py-3">
                      <SeoStatusBadge status={chapter.seoStatus} />
                    </td>
                    <td className="px-3 py-3 text-xs text-zinc-500">
                      {formatDate(chapter.scheduledAt ?? chapter.publishedAt ?? chapter.updatedAt)}
                    </td>
                    <td className="px-3 py-3">
                      <ChapterRowActions
                        chapter={chapter}
                        onChanged={refresh}
                        storyId={storyId}
                        storyPublicCode={story.publicCode}
                        storySlug={story.slug}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 lg:hidden">
            {chapters.map((chapter) => (
              <article
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
                key={chapter.id}
              >
                <div className="flex items-start gap-3">
                  <input
                    checked={selected.has(chapter.id)}
                    className="mt-1"
                    onChange={() => toggleOne(chapter.id)}
                    type="checkbox"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                      Chương {chapter.episodeNumber}
                      {chapter.publicCode ? (
                        <>
                          {" "}
                          ·{" "}
                          <ChapterCodeCell code={chapter.publicCode} />
                        </>
                      ) : null}
                    </p>
                    <h3 className="mt-1 line-clamp-2 font-semibold text-white">{chapter.title}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StudioStatusBadge kind="chapter" status={chapter.displayStatus} />
                      <ChapterFormatBadge contentFormat={chapter.contentFormat} />
                      <SeoStatusBadge status={chapter.seoStatus} />
                      <MonetizationBadge chapter={chapter} />
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">
                      {formatCount(chapter.wordCount)} từ
                      {chapter.readingMinutes ? ` · ~${chapter.readingMinutes} phút` : ""}
                      {chapter.readCount ? ` · ${formatCount(chapter.readCount)} lượt đọc` : ""}
                    </p>
                  </div>
                  <ChapterRowActions
                    chapter={chapter}
                    onChanged={refresh}
                    storyId={storyId}
                    storyPublicCode={story.publicCode}
                    storySlug={story.slug}
                  />
                </div>
                <Link
                  className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-zinc-100"
                  href={studioPath(`/stories/${storyId}/chapters/${chapter.id}/edit`)}
                >
                  Sửa
                </Link>
              </article>
            ))}
          </div>
        </>
      )}

      <StudioPagination
        buildHref={(nextPage) =>
          buildStudioManagerHref(basePath, { ...query, page: String(nextPage), pageSize: String(pageSize) })
        }
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
