import { buildContentPostPinterestFeedItems } from "@/lib/seo/pinterest-feed";
import { pinterestFeedResponse } from "@/lib/seo/pinterest-feed-xml";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await buildContentPostPinterestFeedItems();
  return pinterestFeedResponse(items, {
    title: "ChapMee Pinterest Feed — Bài viết",
    description: "Canonical article discovery URLs for ChapMee"
  });
}
