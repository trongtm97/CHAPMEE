import type { StoryDetail } from "@/lib/stories/getStoryBySlug";

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
  const description =
    story.longDescription?.trim() ||
    story.shortDescription?.trim() ||
    story.hook?.trim() ||
    "Chưa có mô tả chi tiết.";
  const updatedAt =
    formatPublishedDate(story.latestEpisodePublishedAt) ??
    formatPublishedDate(
      story.episodes
        .map((episode) => episode.publishedAt)
        .filter((value): value is string => Boolean(value))
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null
    );

  return (
    <div className="space-y-4 text-sm leading-7 text-zinc-300">
      <p className="whitespace-pre-wrap">{description}</p>
      <dl className="grid gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-500">Tác giả</dt>
          <dd className="font-semibold text-zinc-100">{story.creatorName ?? "ChapMee"}</dd>
        </div>
        {story.genreName ? (
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">Thể loại</dt>
            <dd className="font-semibold text-zinc-100">{story.genreName}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-500">Trạng thái</dt>
          <dd className="font-semibold text-zinc-100">{statusLabel(story.isCompleted)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-500">Số chương</dt>
          <dd className="font-semibold text-zinc-100">{story.episodeCount}</dd>
        </div>
        {updatedAt ? (
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">Cập nhật</dt>
            <dd className="font-semibold text-zinc-100">{updatedAt}</dd>
          </div>
        ) : null}
      </dl>
      {story.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {story.tags.map((tag) => (
            <span
              className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-zinc-300"
              key={tag}
            >
              {tag}
            </span>
          ))}
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
