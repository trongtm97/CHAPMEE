import { NextResponse } from "next/server";
import { analyticsEvents } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/trackServerEvent";
import { incrementReelsCtaClick } from "@/lib/reels/increment-reels-cta-click";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    storyId?: string;
    chapterId?: string | null;
    reelItemId?: string | null;
    episodeId?: string | null;
    itemIndex?: number;
  };

  const storyId = body.storyId?.trim();
  if (!storyId) {
    return NextResponse.json({ error: "Missing storyId." }, { status: 400 });
  }

  const chapterId = body.chapterId?.trim() || body.episodeId?.trim() || null;
  const reelItemId = body.reelItemId?.trim() || null;

  await incrementReelsCtaClick({ chapterId, reelItemId, storyId });

  const targetId = reelItemId ?? chapterId ?? storyId;
  await trackServerEvent({
    eventName: analyticsEvents.reelsReadMoreClicked,
    metadata: {
      chapter_id: chapterId,
      episode_id: chapterId,
      item_index: Number(body.itemIndex ?? 0),
      reel_item_id: reelItemId,
      story_id: storyId
    },
    targetId,
    targetType: chapterId ? "episode" : "story"
  });
  await trackServerEvent({
    eventName: analyticsEvents.feedReadMore,
    metadata: {
      chapter_id: chapterId,
      episode_id: chapterId,
      item_index: Number(body.itemIndex ?? 0),
      reel_item_id: reelItemId,
      story_id: storyId
    },
    targetId,
    targetType: chapterId ? "episode" : "story"
  });

  return NextResponse.json({ ok: true });
}
