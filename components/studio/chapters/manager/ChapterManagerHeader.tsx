import Link from "next/link";
import { StoryStructureBadge } from "@/components/studio/stories/StoryStructureSelector";
import { PublicCodeCopy } from "@/components/studio/import/PublicCodeCopy";
import { StudioStatusBadge } from "@/components/studio/StudioStatusBadge";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import { studioPath } from "@/lib/studio/constants";
import type {
  StudioChapterManagerStats,
  StudioStoryHeader
} from "@/lib/studio/get-studio-chapters";

type ChapterManagerHeaderProps = {
  importNotice?: string | null;
  stats: StudioChapterManagerStats | null;
  story: StudioStoryHeader;
  storyId: string;
};

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

function formatCount(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function canViewPublicStory(story: StudioStoryHeader) {
  return (
    (story.status === "published" || story.status === "approved") &&
    story.visibility === "public"
  );
}

export function ChapterManagerHeader({
  importNotice,
  stats,
  story,
  storyId
}: ChapterManagerHeaderProps) {
  return (
    <header className="space-y-4">
      <nav className="text-sm text-zinc-500">
        <Link className="hover:text-zinc-300" href={studioPath("/stories")}>
          Truyện của tôi
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-400">{story.title}</span>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Chương</span>
      </nav>

      {importNotice ? (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
          {importNotice}
        </div>
      ) : null}

      {!canViewPublicStory(story) && stats && stats.publishedCount > 0 ? (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
          Truyện đang nháp hoặc riêng tư — {formatCount(stats.publishedCount)} chương đã
          đăng sẽ tự hiện khi truyện công khai, không cần đăng lại từng chương. Chương
          nháp vẫn ẩn cho đến khi bạn đăng thủ công.
        </div>
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <StoryStructureBadge structureType="chaptered" />
            <StudioStatusBadge kind="story" status={story.displayStatus} />
          </div>
          <h1 className="line-clamp-2 text-2xl font-black text-white sm:text-3xl">{story.title}</h1>
          {story.publicCode ? (
            <PublicCodeCopy code={story.publicCode} label="Mã truyện (story_code)" />
          ) : null}
          <p className="text-xs leading-5 text-zinc-500">
            Cập nhật hàng loạt: bấm <strong className="font-semibold text-zinc-400">Xuất chương CSV</strong>
            {" → "}
            sửa file (cột <span className="font-mono text-cyan-200/80">chapter_code</span>,{" "}
            <span className="font-mono text-cyan-200/80">chapter_order</span>,{" "}
            <span className="font-mono text-cyan-200/80">story_code</span>) →{" "}
            <Link className="font-semibold text-cyan-200 underline-offset-2 hover:underline" href={studioPath("/import?tab=import-chapters")}>
              Nhập chương CSV
            </Link>
            . Bấm mã chương trong bảng để sao chép.
          </p>
          {stats ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4 lg:grid-cols-4">
              <div>
                <dt className="text-zinc-500">Tổng chương</dt>
                <dd className="font-semibold text-zinc-200">{formatCount(stats.totalChapters)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Đã đăng</dt>
                <dd className="font-semibold text-emerald-300">{formatCount(stats.publishedCount)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Nháp</dt>
                <dd className="font-semibold text-amber-200">{formatCount(stats.draftCount)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Lên lịch</dt>
                <dd className="font-semibold text-sky-300">{formatCount(stats.scheduledCount)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Lượt đọc</dt>
                <dd className="font-semibold text-zinc-200">{formatCount(stats.totalReads)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Bình luận</dt>
                <dd className="font-semibold text-zinc-200">{formatCount(stats.totalComments)}</dd>
              </div>
              <div className="col-span-2 sm:col-span-2">
                <dt className="text-zinc-500">Cập nhật gần nhất</dt>
                <dd className="font-semibold text-zinc-200">{formatDate(stats.lastUpdatedAt)}</dd>
              </div>
            </dl>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-300"
            href={studioPath(`/stories/${storyId}/chapters/new`)}
          >
            Viết chương mới
          </Link>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
            href={studioPath(`/stories/${storyId}/import`)}
          >
            Nhập hàng loạt (.txt)
          </Link>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15"
            href={studioPath(`/import?tab=export&storyId=${storyId}`)}
          >
            Xuất chương CSV
          </Link>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
            href={studioPath("/import?tab=import-chapters")}
          >
            Nhập CSV cập nhật
          </Link>
          <Link
            className="hidden min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10 lg:inline-flex"
            href={`${studioPath(`/stories/${storyId}/chapters`)}?reorder=1`}
          >
            Sắp xếp chương
          </Link>
          {canViewPublicStory(story) ? (
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
              href={getStoryDetailHref({
                public_code: story.publicCode,
                slug: story.slug
              })}
            >
              Xem trang truyện
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
