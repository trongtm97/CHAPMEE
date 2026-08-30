import { NextResponse } from "next/server";
import { enrichGroupFeedItems } from "@/lib/community-sync/enrich-group-feed-items";
import { getStoryGroupFeedByStoryId } from "@/lib/community-sync/get-story-group-feed";
import type { SourceEntityType } from "@/lib/community-sync/constants";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ storyId: string }>;
};

const VALID_SOURCE_TYPES = new Set([
  "chapter",
  "story",
  "reel",
  "audio_episode",
  "adaptation_episode",
  "trailer",
  "review",
  "comment"
]);

const MEDIA_SOURCE_TYPES: SourceEntityType[] = [
  "reel",
  "audio_episode",
  "adaptation_episode",
  "trailer"
];

export async function GET(request: Request, { params }: RouteParams) {
  const { storyId } = await params;
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limit = Number(searchParams.get("limit") ?? "20");
  const sourceEntityTypeParam = searchParams.get("sourceEntityType");
  const tab = searchParams.get("tab");
  const visibility = searchParams.get("visibility") ?? "visible";
  const moderationStatus = searchParams.get("moderationStatus") ?? "approved";

  const sourceEntityType =
    sourceEntityTypeParam && VALID_SOURCE_TYPES.has(sourceEntityTypeParam)
      ? (sourceEntityTypeParam as SourceEntityType)
      : null;

  const sourceEntityTypes =
    tab === "media"
      ? MEDIA_SOURCE_TYPES
      : tab === "reels"
        ? (["reel"] as SourceEntityType[])
        : tab === "audio"
          ? (["audio_episode"] as SourceEntityType[])
          : tab === "films"
            ? (["adaptation_episode", "trailer"] as SourceEntityType[])
            : null;

  const result = await getStoryGroupFeedByStoryId(storyId, {
    cursor,
    limit,
    sourceEntityType,
    sourceEntityTypes,
    chapterSourceOnly: tab === "chapters",
    reviewOnly: tab === "reviews",
    visibility,
    moderationStatus
  });

  if (result.error && !result.items.length) {
    return NextResponse.json({ ...result, items: [] }, { status: 404 });
  }

  const items = await enrichGroupFeedItems(result.items);

  return NextResponse.json({
    ...result,
    items
  });
}
