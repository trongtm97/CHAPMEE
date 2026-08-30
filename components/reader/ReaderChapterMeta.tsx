import Link from "next/link";
import { AuthorNameLink } from "@/components/profile/AuthorNameLink";
import type { EpisodeReaderData } from "@/lib/episodes/getEpisodeReaderData";
import { getStoryDetailHref } from "@/lib/stories/story-routes";

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
  const storyHref = getStoryDetailHref({
    slug: data.story.slug,
    public_code: data.story.publicCode
  });

  return (
    <header className="min-w-0 space-y-1.5 pb-3 pt-2 lg:pt-3">
      <nav aria-label="Breadcrumb" className="text-[0.6875rem] text-zinc-500">
        {data.story.genreName ? (
          <span className="text-cyan-200/70">{data.story.genreName}</span>
        ) : null}
        {data.story.genreName && storyTitle ? <span className="mx-1">·</span> : null}
        {storyTitle ? (
          <Link className="font-medium text-zinc-400 hover:text-zinc-200" href={storyHref}>
            {storyTitle}
          </Link>
        ) : null}
      </nav>
      <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-cyan-200/85">
        Chương {data.episode.episodeNumber}
      </p>
      <h1
        className="text-xl font-bold leading-snug text-white sm:text-[1.65rem] sm:leading-tight"
        title={data.episode.title}
      >
        {data.episode.title}
      </h1>
      {creatorName ? (
        <p className="text-sm text-zinc-400">
          <AuthorNameLink
            badge={data.story.authorVerification}
            name={creatorName}
            username={data.story.creatorUsername}
          />
        </p>
      ) : null}
      {publishedLabel ? (
        <p className="text-[0.6875rem] text-zinc-500">Cập nhật {publishedLabel}</p>
      ) : null}
    </header>
  );
}
