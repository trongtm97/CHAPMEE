import { buildPinterestFeedItems } from "@/lib/seo/pinterest-feed";
import { pinterestFeedResponse } from "@/lib/seo/pinterest-feed-xml";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await buildPinterestFeedItems();
  return pinterestFeedResponse(items, {
    title: "ChapMee Pinterest Feed",
    description: "Canonical story, article and taxonomy discovery URLs for ChapMee"
  });
}
