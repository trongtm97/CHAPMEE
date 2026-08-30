"use client";



import type { ReactNode } from "react";

import Link from "next/link";

import { useState } from "react";

import { StudioRowActionMenu } from "@/components/studio/StudioRowActionMenu";

import { StudioStatusBadge } from "@/components/studio/StudioStatusBadge";

import { StudioStoriesToast } from "@/components/studio/stories/StudioStoriesToast";

import {

  deleteDraftStudioStoryAction,

  duplicateStudioStoryAction,

  hideStudioStoryAction,

  markCompleteStudioStoryAction,

  moveToDraftStudioStoryAction,

  submitForReviewStudioStoryAction,

  unhideStudioStoryAction

} from "@/lib/studio/manager-actions";

import {

  storiesBtnCompactPrimary,

  storiesBtnCompactSecondary,

  storiesMobileActionGrid

} from "@/components/studio/stories/shared/styles";

import { studioPath } from "@/lib/studio/constants";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import { isStandaloneStory } from "@/lib/stories/story-structure";
import { StoryStructureBadge } from "@/components/studio/stories/StoryStructureSelector";
import type { StudioStory } from "@/lib/studio/get-studio-stories";



type StudioStoryCardProps = {

  onSelect?: (storyId: string, selected: boolean) => void;

  selected?: boolean;

  showCheckbox?: boolean;

  story: StudioStory;

};



function formatDate(value: string) {

  try {

    return new Intl.DateTimeFormat("vi-VN", {

      day: "2-digit",

      month: "2-digit",

      year: "numeric"

    }).format(new Date(value));

  } catch {

    return "—";

  }

}



function formatCount(value: number) {

  return new Intl.NumberFormat("vi-VN", {

    notation: value >= 10_000 ? "compact" : "standard"

  }).format(value);

}



function StudioStoryCoverThumb({
  coverThumbUrl,
  editHref
}: {
  coverThumbUrl: string | null;
  editHref: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!coverThumbUrl || failed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-zinc-800 to-zinc-900 p-1.5 text-center">
        <span className="text-[0.6rem] font-medium leading-tight text-zinc-500">
          {failed ? "Không tải được bìa" : "Chưa có bìa"}
        </span>
        <Link
          className="inline-flex min-h-7 w-full items-center justify-center rounded-md bg-cyan-300/90 px-1 text-[0.6rem] font-semibold text-zinc-950 hover:bg-cyan-200"
          href={editHref}
        >
          {failed ? "Sửa bìa" : "Thêm bìa"}
        </Link>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt=""
      className="h-full w-full object-cover"
      decoding="async"
      loading="lazy"
      onError={() => setFailed(true)}
      src={coverThumbUrl}
    />
  );
}



function canViewPublicPage(story: StudioStory) {

  return (

    (story.status === "published" || story.status === "approved") &&

    story.visibility === "public"

  );

}



function WarningBadge({ children }: { children: ReactNode }) {

  return (

    <span className="inline-flex max-w-full items-center rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[0.65rem] font-medium text-amber-200">

      <span className="truncate">{children}</span>

    </span>

  );

}



function Metric({

  className = "",

  label,

  value

}: {

  className?: string;

  label: string;

  value: string | number;

}) {

  return (

    <div className={`min-w-0 ${className}`}>

      <dt className="text-[0.65rem] text-zinc-500">{label}</dt>

      <dd className="truncate text-xs font-semibold tabular-nums text-zinc-200">

        {value}

      </dd>

    </div>

  );

}



export function StudioStoryCard({

  onSelect,

  selected = false,

  showCheckbox = false,

  story

}: StudioStoryCardProps) {

  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(

    null

  );



  const chaptersHref = studioPath(`/stories/${story.id}/chapters`);
  const contentHref = studioPath(`/stories/${story.id}/content`);
  const manageContentHref = isStandaloneStory(story) ? contentHref : chaptersHref;
  const isStandalone = isStandaloneStory(story);
  const manageContentLabel = isStandalone ? "Soạn nội dung" : "Quản lý chương";

  const editHref = studioPath(`/stories/${story.id}/edit`);

  const newChapterHref = studioPath(`/stories/${story.id}/chapters/new`);

  const publicHref = getStoryDetailHref({
    slug: story.slug,
    public_code: story.publicCode
  });

  const calendarHref = studioPath("/calendar");

  const reelsHref = studioPath("/reels/new");

  const canDeleteDraft = story.status === "draft";

  const isHidden = story.displayStatus === "hidden";

  const canUnhide = isHidden || story.status === "archived";

  const canHide = !canUnhide && story.status !== "draft";

  const canSubmitReview = story.status === "rejected" || story.status === "draft";

  const previewHref = canViewPublicPage(story) ? publicHref : editHref;
  const titleHref = canViewPublicPage(story) ? publicHref : editHref;



  const warnings: string[] = [];

  if (story.missingCover) {

    warnings.push("Thiếu bìa");

  }

  if (story.missingDescription) {

    warnings.push("Thiếu mô tả");

  }

  if (story.noChapters) {
    warnings.push(isStandalone ? "Chưa có nội dung" : "Chưa có chương");
  }

  if (story.hasQualityWarning) {

    warnings.push("Cảnh báo chất lượng");

  }



  const publicFullUrl =

    typeof window !== "undefined"

      ? `${window.location.origin}${publicHref}`

      : publicHref;



  const menuItems = [

    ...(canViewPublicPage(story)

      ? [{ type: "link" as const, href: publicHref, label: "Xem trên ChapMee" }]

      : []),

    { type: "link" as const, href: previewHref, label: "Xem preview" },

    {

      type: "action" as const,

      label: "Sao chép link",

      onAction: async () => {

        try {

          await navigator.clipboard.writeText(publicFullUrl);

          setToast({ message: "Đã sao chép link truyện.", variant: "success" });

          return { ok: true };

        } catch {

          return { ok: false, error: "Không sao chép được link." };

        }

      }

    },

    ...(isStandalone
      ? [{ type: "link" as const, href: contentHref, label: "Soạn nội dung" }]
      : [{ type: "link" as const, href: newChapterHref, label: "Thêm chương" }]),

    { type: "link" as const, href: calendarHref, label: "Lên lịch" },

    { type: "link" as const, href: reelsHref, label: "Tạo Reels" },

    {

      type: "action" as const,

      label: "Nhân bản",

      onAction: async () => {

        const result = await duplicateStudioStoryAction(story.id);

        if (result.ok) {

          setToast({ message: "Đã tạo bản sao truyện (nháp).", variant: "success" });

        }

        return result;

      }

    },

    ...(canHide

      ? [

          {

            type: "action" as const,

            label: "Ẩn truyện",

            onAction: async () => {

              const result = await hideStudioStoryAction(story.id);

              if (result.ok) {

                setToast({ message: "Đã ẩn truyện.", variant: "success" });

              }

              return result;

            }

          }

        ]

      : []),

    ...(canUnhide

      ? [

          {

            type: "action" as const,

            label: "Hiện lại truyện",

            onAction: async () => {

              const result = await unhideStudioStoryAction(story.id);

              if (result.ok) {

                setToast({ message: "Đã hiện lại truyện (nháp).", variant: "success" });

              }

              return result;

            }

          }

        ]

      : []),

    {

      type: "action" as const,

      label: "Đánh dấu hoàn thành",

      onAction: async () => {

        const result = await markCompleteStudioStoryAction(story.id);

        if (result.ok) {

          setToast({ message: "Đã đánh dấu hoàn thành.", variant: "success" });

        }

        return result;

      }

    },

    {

      type: "action" as const,

      label: "Chuyển về nháp",

      onAction: async () => {

        const result = await moveToDraftStudioStoryAction(story.id);

        if (result.ok) {

          setToast({ message: "Đã chuyển về nháp.", variant: "success" });

        }

        return result;

      }

    },

    ...(canSubmitReview

      ? [

          {

            type: "action" as const,

            label: "Đăng lại",

            onAction: async () => {

              const result = await submitForReviewStudioStoryAction(story.id);

              if (result.ok) {

                setToast({ message: "Đã gửi duyệt lại.", variant: "success" });

              }

              return result;

            }

          }

        ]

      : []),

    ...(canDeleteDraft

      ? [

          {

            type: "action" as const,

            confirmMessage:

              "Xóa vĩnh viễn truyện nháp này? Thao tác không hoàn tác được.",

            destructive: true,

            label: "Xóa truyện",

            onAction: () => deleteDraftStudioStoryAction(story.id)

          }

        ]

      : [])

  ];



  return (

    <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 transition hover:border-white/15 hover:bg-white/[0.03] sm:p-4">

      <div className="flex gap-3">

        {showCheckbox ? (

          <label className="flex shrink-0 items-start pt-0.5">

            <input

              checked={selected}

              className="h-5 w-5 rounded border-white/20 bg-zinc-950 text-cyan-300 focus:ring-cyan-300/40 sm:h-4 sm:w-4"

              onChange={(event) => onSelect?.(story.id, event.target.checked)}

              type="checkbox"

            />

            <span className="sr-only">Chọn {story.title}</span>

          </label>

        ) : null}



        <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5 sm:h-24 sm:w-[4.5rem] lg:h-28 lg:w-20">

          <StudioStoryCoverThumb coverThumbUrl={story.coverThumbUrl} editHref={editHref} />

        </div>



        <div className="min-w-0 flex-1">

          <div className="flex items-start gap-2">

            <div className="min-w-0 flex-1">

              <Link className="hover:text-cyan-200" href={titleHref}>

                <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white sm:text-base">

                  {story.title}

                </h3>

              </Link>

              {story.description ? (

                <p className="mt-0.5 line-clamp-2 text-xs text-zinc-400 sm:line-clamp-1 sm:text-sm">

                  {story.description}

                </p>

              ) : (

                <p className="mt-0.5 text-xs italic text-zinc-600">Chưa có mô tả</p>

              )}

            </div>



            <div className="hidden shrink-0 items-center gap-1.5 lg:flex">

              <Link className={`${storiesBtnCompactPrimary} sm:w-auto`} href={manageContentHref}>

                {manageContentLabel}

              </Link>

              <Link className={`${storiesBtnCompactSecondary} sm:w-auto`} href={editHref}>

                Sửa truyện

              </Link>

              <StudioRowActionMenu

                ariaLabel={`Tùy chọn truyện ${story.title}`}

                items={menuItems}

                mobileSheet

              />

            </div>



            <div className="shrink-0 lg:hidden">

              <StudioRowActionMenu

                ariaLabel={`Tùy chọn truyện ${story.title}`}

                items={[

                  { type: "link", href: editHref, label: "Sửa truyện" },

                  { type: "link", href: manageContentHref, label: manageContentLabel },

                  ...menuItems

                ]}

                mobileSheet

              />

            </div>

          </div>



          <div className="mt-2 flex flex-wrap items-center gap-1.5">

            <StudioStatusBadge kind="story" status={story.displayStatus} />
            <StoryStructureBadge structureType={story.structureType} />

            {story.contentTypeName ? (
              <span className="truncate rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[0.65rem] text-cyan-100">
                {story.contentTypeName}
              </span>
            ) : null}
            {story.genreName ? (
              <span className="truncate rounded-full border border-white/10 px-2 py-0.5 text-[0.65rem] text-zinc-400">
                {story.genreName}
              </span>
            ) : null}
            {story.taxonomyTagPreview?.map((tag) => (
              <span
                className="truncate rounded-full border border-white/5 px-2 py-0.5 text-[0.65rem] text-zinc-500"
                key={tag}
              >
                {tag}
              </span>
            ))}
            {warnings.map((warning) => (

              <WarningBadge key={warning}>{warning}</WarningBadge>

            ))}

          </div>



          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-5">

            <Metric
              label={isStandalone ? "Thời gian đọc" : "Chương"}
              value={
                isStandalone
                  ? story.standaloneReadingTimeMinutes > 0
                    ? `${story.standaloneReadingTimeMinutes} phút`
                    : "—"
                  : story.episodeCount
              }
            />

            <Metric label="Đọc 7 ngày" value={formatCount(story.reads7d)} />

            <Metric className="lg:hidden" label="Cập nhật" value={formatDate(story.updatedAt)} />

            <Metric className="hidden lg:block" label="Lưu" value={formatCount(story.saves7d)} />

            <Metric className="hidden lg:block" label="BL mới" value={formatCount(story.newComments7d)} />

            <Metric className="hidden lg:block" label="Cập nhật" value={formatDate(story.updatedAt)} />

          </dl>

        </div>

      </div>



      <div className={`${storiesMobileActionGrid} mt-3 border-t border-white/5 pt-3 lg:hidden`}>

        <Link className={storiesBtnCompactPrimary} href={manageContentHref}>

          {manageContentLabel}

        </Link>

        <Link className={storiesBtnCompactSecondary} href={editHref}>

          Sửa truyện

        </Link>

      </div>



      <StudioStoriesToast

        message={toast?.message ?? null}

        onDismiss={() => setToast(null)}

        variant={toast?.variant}

      />

    </article>

  );

}


