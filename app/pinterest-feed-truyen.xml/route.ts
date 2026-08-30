import { buildStoryPinterestFeedItems } from "@/lib/seo/pinterest-feed";
import { pinterestFeedResponse } from "@/lib/seo/pinterest-feed-xml";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await buildStoryPinterestFeedItems();
  return pinterestFeedResponse(items, {
    title: "ChapMee Pinterest Feed — Truyện",
    description: "Canonical story discovery URLs for ChapMee"
  });
}
