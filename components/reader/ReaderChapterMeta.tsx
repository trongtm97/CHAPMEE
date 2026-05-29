import { VerifiedName } from "@/components/profile/VerifiedBadge";
import type { EpisodeReaderData } from "@/lib/episodes/getEpisodeReaderData";

type ReaderChapterMetaProps = {
  data: EpisodeReaderData;
};

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

export function ReaderChapterMeta({ data }: ReaderChapterMetaProps) {
  const publishedLabel = formatDate(data.episode.publishedAt);
  const storyTitle = data.story.title?.trim() ?? "";
  const creatorName = data.story.creatorName?.trim() ?? "";

  return (
    <div className="min-w-0 space-y-1.5 pb-3 pt-3">
      <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-cyan-200/85">
        Chap {data.episode.episodeNumber}
      </p>
      <h1
        className="line-clamp-2 text-xl font-bold leading-snug text-white sm:text-[1.35rem] sm:leading-tight"
        title={data.episode.title}
      >
        {data.episode.title}
      </h1>
      <p
        className="truncate text-sm text-zinc-400"
        title={[storyTitle, creatorName].filter(Boolean).join(" · ")}
      >
        {storyTitle ? <span>{storyTitle}</span> : null}
        {storyTitle && creatorName ? <span className="text-zinc-600"> · </span> : null}
        {creatorName ? (
          <VerifiedName badge={data.story.authorVerification} name={creatorName} />
        ) : null}
      </p>
      {publishedLabel ? (
        <p className="text-[0.6875rem] text-zinc-500">Cập nhật {publishedLabel}</p>
      ) : null}
    </div>
  );
}
