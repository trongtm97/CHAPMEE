import { NextResponse } from "next/server";
import { mutateSwipeEngagement } from "@/lib/swipe/mutateSwipeEngagement";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    action?: "follow" | "like" | "save" | "share";
    creatorId?: string | null;
    episodeId?: string;
    itemIndex?: number;
    storyId?: string;
  };

  if (!body.action || !body.episodeId || !body.storyId) {
    return NextResponse.json(
      { error: "Missing swipe engagement payload." },
      { status: 400 }
    );
  }

  const result = await mutateSwipeEngagement({
    action: body.action,
    creatorId: body.creatorId ?? null,
    episodeId: body.episodeId,
    itemIndex: Number(body.itemIndex ?? 0),
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
