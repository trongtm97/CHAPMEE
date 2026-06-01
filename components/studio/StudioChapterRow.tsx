"use client";

import Link from "next/link";
import { ChapterFormatBadge } from "@/components/studio/presentation/ChapterFormatBadge";
import { ComposerValidationBadge } from "@/components/studio/presentation/ComposerValidationBadge";
import { StudioRowActionMenu } from "@/components/studio/StudioRowActionMenu";
import { StudioStatusBadge } from "@/components/studio/StudioStatusBadge";
import {
  deleteDraftStudioChapterAction,
  hideStudioChapterAction
} from "@/lib/studio/manager-actions";
import { studioPath } from "@/lib/studio/constants";
import { getStoryChapterHref } from "@/lib/stories/story-routes";
import type { StudioChapter } from "@/lib/studio/get-studio-chapters";

type StudioChapterRowProps = {
  chapter: StudioChapter;
  storyId: string;
  storySlug: string;
  storyPublicCode: string;
};

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatCount(value: number | null) {
  if (value === null) {
    return null;
  }

  return new Intl.NumberFormat("vi-VN").format(value);
}

function canViewPublicChapter(chapter: StudioChapter) {
  return chapter.status === "published" || chapter.status === "approved";
}

export function StudioChapterRow({
  chapter,
  storyId,
  storySlug,
  storyPublicCode
}: StudioChapterRowProps) {
  const editHref = studioPath(
    `/stories/${storyId}/chapters/${chapter.id}/edit`
  );
  const publicHref = getStoryChapterHref(
    { slug: storySlug, public_code: storyPublicCode },
    { slug: chapter.slug, public_code: chapter.publicCode }
  );
  const scheduleHref = `${editHref}#lich-dang`;
  const canDeleteDraft = chapter.status === "draft";
  const publishDate = chapter.publishedAt ?? null;

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
            Chương {chapter.episodeNumber}
          </p>
          <h3 className="mt-1 line-clamp-2 text-base font-semibold text-white">
            {chapter.title}
          </h3>
          {chapter.excerpt ? (
            <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
              {chapter.excerpt}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StudioStatusBadge kind="chapter" status={chapter.displayStatus} />
            <ChapterFormatBadge contentFormat={chapter.contentFormat} />
            {chapter.contentFormat === "structured_blocks" ? (
              <ComposerValidationBadge status={chapter.validationStatus} />
            ) : null}
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-zinc-400 sm:grid-cols-4">
            <div>
              <dt className="text-zinc-500">Số từ</dt>
              <dd className="font-semibold text-zinc-200">
                {new Intl.NumberFormat("vi-VN").format(chapter.wordCount)}
              </dd>
            </div>
            {chapter.readingMinutes !== null ? (
              <div>
                <dt className="text-zinc-500">Đọc ~</dt>
                <dd className="font-semibold text-zinc-200">
                  {chapter.readingMinutes} phút
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-zinc-500">
                {publishDate ? "Ngày đăng" : "Cập nhật"}
              </dt>
              <dd className="font-semibold text-zinc-200">
                {formatDate(publishDate ?? chapter.updatedAt)}
              </dd>
            </div>
            {chapter.readCount !== null ? (
              <div>
                <dt className="text-zinc-500">Lượt đọc</dt>
                <dd className="font-semibold text-zinc-200">
                  {formatCount(chapter.readCount)}
                </dd>
              </div>
            ) : null}
            {chapter.commentCount !== null ? (
              <div>
                <dt className="text-zinc-500">Bình luận</dt>
                <dd className="font-semibold text-zinc-200">
                  {formatCount(chapter.commentCount)}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        <StudioRowActionMenu
          ariaLabel={`Tùy chọn chương ${chapter.episodeNumber}`}
          items={[
            { type: "link", href: editHref, label: "Sửa chương" },
            ...(canViewPublicChapter(chapter)
              ? [
                  {
                    type: "link" as const,
                    href: publicHref,
                    label: "Xem chương"
                  }
                ]
              : []),
            { type: "link", href: editHref, label: "Nhân bản" },
            { type: "link", href: scheduleHref, label: "Lên lịch" },
            { type: "link", href: editHref, label: "Đăng ngay" },
            {
              type: "action",
              label: "Ẩn",
              onAction: () => hideStudioChapterAction(storyId, chapter.id)
            },
            ...(canDeleteDraft
              ? [
                  {
                    type: "action" as const,
                    confirmMessage:
                      "Xóa vĩnh viễn chương nháp này? Thao tác không hoàn tác được.",
                    destructive: true,
                    label: "Xóa nháp",
                    onAction: () =>
                      deleteDraftStudioChapterAction(storyId, chapter.id)
                  }
                ]
              : [])
          ]}
        />
      </div>

      <div className="mt-4">
        <Link
          className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10 sm:w-auto"
          href={editHref}
        >
          Sửa
        </Link>
      </div>
    </article>
  );
}
