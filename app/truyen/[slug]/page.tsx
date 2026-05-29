import StoryPage, { generateMetadata as generateStoryMetadata } from "@/app/stories/[slug]/page";
import { getPublicStorySlugs } from "@/lib/seo/static-params";

type StoryRouteProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: StoryRouteProps) {
  return generateStoryMetadata({ params });
}

export async function generateStaticParams() {
  const slugs = await getPublicStorySlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function StorySeoRoute({ params }: StoryRouteProps) {
  return <StoryPage params={params} />;
}
