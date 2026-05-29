import PublicStoryPage from "@/app/stories/[slug]/page";

export { generateMetadata } from "@/app/stories/[slug]/page";

export default async function StoryRedirectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicStoryPage params={Promise.resolve({ slug })} />;
}
