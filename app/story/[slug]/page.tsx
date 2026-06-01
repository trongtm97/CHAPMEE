import { permanentRedirect } from "next/navigation";
import PublicStoryPage from "@/app/stories/[slug]/page";
import { resolveStoryFromSegment } from "@/lib/urls/resolve-story";

export { generateMetadata } from "@/app/stories/[slug]/page";

type StoryLegacyRouteProps = {
  params: Promise<{ slug: string }>;
};

/** Legacy `/story/[slug]` → canonical `/truyen/...` when resolvable. */
export default async function StoryLegacyRoute({ params }: StoryLegacyRouteProps) {
  const { slug } = await params;
  const resolved = await resolveStoryFromSegment(slug);
  if (resolved.story && resolved.canonicalPath) {
    permanentRedirect(resolved.canonicalPath);
  }
  return <PublicStoryPage params={Promise.resolve({ slug })} />;
}
