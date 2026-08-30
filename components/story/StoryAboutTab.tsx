import { useState } from "react";
import Link from "next/link";
import { renderContentPostToSafeHtml } from "@/lib/content-posts/content-post-html";
import { isLikelyHtmlContent } from "@/lib/content-posts/content-post-editor-html";
import type { StoryDetail } from "@/lib/stories/getStoryBySlug";
import { isStandaloneStory } from "@/lib/stories/story-structure";

type StoryAboutTabProps = {
  story: StoryDetail;
  showOriginalsNote: boolean;
};

function statusLabel(isCompleted: boolean) {
  return isCompleted ? "Hoàn thành" : "Đang ra";
}

function formatPublishedDate(value: string | null) {
  if (!value) {
    return null;
  }
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

export function StoryAboutTab({ showOriginalsNote, story }: StoryAboutTabProps) {
  const [showAllTags, setShowAllTags] = useState(false);
  const displayTags = showAllTags
    ? [...story.tags, ...story.tagsExtra]
    : story.tags;
  const description =
    story.longDescription?.trim() ||
    story.shortDescription?.trim() ||
    story.hook?.trim() ||
    "Chưa có mô tả chi tiết.";
  const updatedAt =
    formatPublishedDate(
      isStandaloneStory(story) ? story.standaloneUpdatedAt : story.latestEpisodePublishedAt
    ) ??
    formatPublishedDate(
      story.episodes
        .map((episode) => episode.publishedAt)
        .filter((value): value is string => Boolean(value))
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null
    );

  const descriptionHtml = isLikelyHtmlContent(description)
    ? renderContentPostToSafeHtml(description)
    : null;

  return (
    <div className="space-y-4 text-sm leading-7 text-zinc-300">
      {descriptionHtml ? (
        <div
          className="story-about-body space-y-3 [&_a]:text-cyan-400 [&_a]:underline [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
        />
      ) : (
        <p className="whitespace-pre-wrap">{description}</p>
      )}
      <dl className="grid gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-500">Tác giả</dt>
          <dd className="font-semibold text-zinc-100">{story.creatorName ?? "ChapMee"}</dd>
        </div>
        {story.genreName ? (
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">Thể loại</dt>
            <dd className="font-semibold text-zinc-100">
              {story.genreSlug ? (
                <Link
                  className="text-cyan-200/90 hover:text-cyan-100"
                  href={`/the-loai/${story.genreSlug}`}
                >
                  {story.genreName}
                </Link>
              ) : (
                story.genreName
              )}
            </dd>
          </div>
        ) : null}
        {story.subgenres.length > 0 ? (
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">Thể loại phụ</dt>
            <dd className="text-right font-semibold text-zinc-100">
              {story.subgenres.join(", ")}
            </dd>
          </div>
        ) : null}
        {story.presentationLabel ? (
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">Cách trình bày</dt>
            <dd className="font-semibold text-zinc-100">{story.presentationLabel}</dd>
          </div>
        ) : null}
        {story.ageRatingLabel ? (
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">Độ tuổi</dt>
            <dd className="font-semibold text-zinc-100">{story.ageRatingLabel}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-500">Trạng thái</dt>
          <dd className="font-semibold text-zinc-100">{statusLabel(story.isCompleted)}</dd>
        </div>
        {isStandaloneStory(story) ? (
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">Hình thức</dt>
            <dd className="font-semibold text-zinc-100">Truyện một phần</dd>
          </div>
        ) : (
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">Số chương</dt>
            <dd className="font-semibold text-zinc-100">{story.episodeCount}</dd>
          </div>
        )}
        {isStandaloneStory(story) && story.standaloneReadingTimeMinutes > 0 ? (
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">Thời gian đọc</dt>
            <dd className="font-semibold text-zinc-100">
              {story.standaloneReadingTimeMinutes} phút
            </dd>
          </div>
        ) : null}
        {updatedAt ? (
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">Cập nhật</dt>
            <dd className="font-semibold text-zinc-100">{updatedAt}</dd>
          </div>
        ) : null}
      </dl>
      {story.contentWarnings.length > 0 ? (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-100">
            Cảnh báo nội dung
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {story.contentWarnings.map((warning) => (
              <span
                className="rounded-full bg-amber-400/15 px-2.5 py-1 text-xs text-amber-50"
                key={warning}
              >
                {warning}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {displayTags.length > 0 ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {displayTags.map((tag) => (
              <span
                className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-zinc-300"
                key={tag}
              >
                {tag}
              </span>
            ))}
          </div>
          {story.tagsExtra.length > 0 ? (
            <button
              className="text-xs text-cyan-300 hover:underline"
              onClick={() => setShowAllTags((v) => !v)}
              type="button"
            >
              {showAllTags ? "Thu gọn tag" : `Xem thêm tag (${story.tagsExtra.length})`}
            </button>
          ) : null}
        </div>
      ) : null}
      {showOriginalsNote ? (
        <p className="rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-amber-100">
          Tác phẩm thuộc ChapMee Originals.
        </p>
      ) : null}
    </div>
  );
}
