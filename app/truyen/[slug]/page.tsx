import { notFound } from "next/navigation";

import StoryPage, { generateMetadata as generateStoryMetadata } from "@/app/stories/[slug]/page";
import { redirectToCanonicalIfNeeded, tryRedirectFromLookupTable } from "@/lib/urls/canonical";
import { getPublicStorySegments } from "@/lib/seo/static-params";
import { resolveStoryFromSegment } from "@/lib/urls/resolve-story";

type StoryRouteProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: StoryRouteProps) {
  const { slug: segment } = await params;
  const { story } = await resolveStoryFromSegment(segment);
  if (!story) {
    return {
      title: "Không tìm thấy truyện",
      robots: { index: false, follow: false }
    };
  }
  return generateStoryMetadata({
    params: Promise.resolve({ slug: segment })
  });
}

export async function generateStaticParams() {
  const segments = await getPublicStorySegments();
  return segments.map((slug) => ({ slug }));
}

export default async function StorySeoRoute({ params }: StoryRouteProps) {
  const { slug: segment } = await params;
  const currentPath = `/truyen/${segment}`;

  await tryRedirectFromLookupTable(currentPath);

  const { story, canonicalPath } = await resolveStoryFromSegment(segment);
  if (!story || !canonicalPath) {
    notFound();
  }

  redirectToCanonicalIfNeeded({ currentPath, canonicalPath });

  return <StoryPage params={Promise.resolve({ slug: segment })} />;
}
