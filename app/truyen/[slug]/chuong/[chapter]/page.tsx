import { notFound } from "next/navigation";

import EpisodePage, { generateMetadata as generateEpisodeMetadata } from "@/app/stories/[slug]/episodes/[episodeNumber]/page";
import { redirectToCanonicalIfNeeded, tryRedirectFromLookupTable } from "@/lib/urls/canonical";
import { getPublicChapterSegments } from "@/lib/seo/static-params";
import { resolveChapterFromSegments } from "@/lib/urls/resolve-chapter";

type ChapterRouteProps = {
  params: Promise<{ slug: string; chapter: string }>;
};

export async function generateMetadata({ params }: ChapterRouteProps) {
  const resolved = await params;
  const chapterResolved = await resolveChapterFromSegments(
    resolved.slug,
    resolved.chapter
  );

  if (!chapterResolved) {
    return {
      title: "Không tìm thấy chương",
      robots: { index: false, follow: false }
    };
  }

  return generateEpisodeMetadata({
    params: Promise.resolve({
      slug: resolved.slug,
      episodeNumber: resolved.chapter
    })
  });
}

export async function generateStaticParams() {
  return getPublicChapterSegments();
}

export default async function ChapterSeoRoute({ params }: ChapterRouteProps) {
  const resolved = await params;
  const currentPath = `/truyen/${resolved.slug}/chuong/${resolved.chapter}`;

  await tryRedirectFromLookupTable(currentPath);

  const chapterResolved = await resolveChapterFromSegments(
    resolved.slug,
    resolved.chapter
  );

  if (!chapterResolved) {
    notFound();
  }

  redirectToCanonicalIfNeeded({
    currentPath,
    canonicalPath: chapterResolved.canonicalPath
  });

  return (
    <EpisodePage
      params={Promise.resolve({
        slug: resolved.slug,
        episodeNumber: resolved.chapter
      })}
    />
  );
}
