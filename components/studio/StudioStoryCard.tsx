import Image from "next/image";
import Link from "next/link";
import { StudioRowActionMenu } from "@/components/studio/StudioRowActionMenu";
import { StudioStatusBadge } from "@/components/studio/StudioStatusBadge";
import {
  deleteDraftStudioStoryAction,
  hideStudioStoryAction
} from "@/lib/studio/manager-actions";
import { studioPath } from "@/lib/studio/constants";
import type { StudioStory } from "@/lib/studio/get-studio-stories";

type StudioStoryCardProps = {
  story: StudioStory;
};

function formatDate(value: string) {
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

function canViewPublicPage(story: StudioStory) {
  return (
    (story.status === "published" || story.status === "approved") &&
    story.visibility === "public"
  );
}

export function StudioStoryCard({ story }: StudioStoryCardProps) {
  const chaptersHref = studioPath(`/stories/${story.id}/chapters`);
  const editHref = studioPath(`/stories/${story.id}/edit`);
  const newChapterHref = studioPath(`/stories/${story.id}/chapters/new`);
  const publicHref = `/stories/${story.slug}`;
  const canDeleteDraft = story.status === "draft";

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
      <div className="flex gap-4">
        <div className="relative h-[7.5rem] w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5 sm:h-32 sm:w-16">
          {story.coverThumbUrl ? (
            <Image
              alt=""
              className="object-cover"
              fill
              sizes="64px"
              src={story.coverThumbUrl}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 px-1 text-center text-[10px] font-semibold text-zinc-500">
              Bìa
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-base font-semibold text-white sm:text-lg">
                {story.title}
              </h3>
              {story.description ? (
                <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
                  {story.description}
                </p>
              ) : null}
            </div>
            <StudioRowActionMenu
              ariaLabel={`Tùy chọn truyện ${story.title}`}
              items={[
                { type: "link", href: editHref, label: "Sửa truyện" },
                { type: "link", href: chaptersHref, label: "Quản lý chương" },
                ...(canViewPublicPage(story)
                  ? [
                      {
                        type: "link" as const,
                        href: publicHref,
                        label: "Xem trang truyện"
                      }
                    ]
                  : []),
                { type: "link", href: newChapterHref, label: "Tạo chương mới" },
                {
                  type: "action",
                  label: "Ẩn truyện",
                  onAction: () => hideStudioStoryAction(story.id)
                },
                ...(canDeleteDraft
                  ? [
                      {
                        type: "action" as const,
                        confirmMessage:
                          "Xóa vĩnh viễn truyện nháp này? Thao tác không hoàn tác được.",
                        destructive: true,
                        label: "Xóa nháp",
                        onAction: () => deleteDraftStudioStoryAction(story.id)
                      }
                    ]
                  : [])
              ]}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StudioStatusBadge kind="story" status={story.displayStatus} />
            {story.genreName ? (
              <span className="truncate rounded-full border border-white/10 px-2 py-0.5 text-xs text-zinc-400">
                {story.genreName}
              </span>
            ) : null}
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-zinc-400 sm:grid-cols-4 sm:text-sm">
            <div>
              <dt className="text-zinc-500">Chương</dt>
              <dd className="font-semibold text-zinc-200">{story.episodeCount}</dd>
            </div>
            {story.readCount !== null ? (
              <div>
                <dt className="text-zinc-500">Lượt đọc</dt>
                <dd className="font-semibold text-zinc-200">
                  {formatCount(story.readCount)}
                </dd>
              </div>
            ) : null}
            <div className="col-span-2 sm:col-span-1">
              <dt className="text-zinc-500">Cập nhật</dt>
              <dd className="font-semibold text-zinc-200">
                {formatDate(story.updatedAt)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-sky-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200"
          href={chaptersHref}
        >
          Quản lý chương
        </Link>
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
          href={editHref}
        >
          Sửa truyện
        </Link>
      </div>
    </article>
  );
}
