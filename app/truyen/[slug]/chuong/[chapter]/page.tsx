import EpisodePage, { generateMetadata as generateEpisodeMetadata } from "@/app/stories/[slug]/episodes/[episodeNumber]/page";
import { getPublicChapterParams } from "@/lib/seo/static-params";

type ChapterRouteProps = {
  params: Promise<{ slug: string; chapter: string }>;
};

export async function generateMetadata({ params }: ChapterRouteProps) {
  const resolved = await params;
  return generateEpisodeMetadata({
    params: Promise.resolve({
      slug: resolved.slug,
      episodeNumber: resolved.chapter
    })
  });
}

export async function generateStaticParams() {
  return getPublicChapterParams();
}

export default async function ChapterSeoRoute({ params }: ChapterRouteProps) {
  const resolved = await params;
  return (
    <EpisodePage
      params={Promise.resolve({
        slug: resolved.slug,
        episodeNumber: resolved.chapter
      })}
    />
  );
}
