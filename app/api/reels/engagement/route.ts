import { NextResponse } from "next/server";
import { mutateReelsEngagement } from "@/lib/reels/mutateReelsEngagement";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    action?: "follow" | "like" | "save" | "share";
    creatorId?: string | null;
    creatorUserId?: string | null;
    episodeId?: string;
    itemIndex?: number;
    reelItemId?: string | null;
    storyId?: string;
  };

  if (!body.action || !body.episodeId || !body.storyId) {
    return NextResponse.json(
      { error: "Missing Reels engagement payload." },
      { status: 400 }
    );
  }

  const result = await mutateReelsEngagement({
    action: body.action,
    creatorId: body.creatorId ?? null,
    creatorUserId: body.creatorUserId ?? null,
    episodeId: body.episodeId,
    itemIndex: Number(body.itemIndex ?? 0),
    reelItemId: body.reelItemId ?? null,
    storyId: body.storyId
  });

  if (!result.ok && result.loginUrl) {
    return NextResponse.json({ loginUrl: result.loginUrl }, { status: 401 });
  }

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
