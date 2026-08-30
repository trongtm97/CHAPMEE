import { NextResponse } from "next/server";

import { incrementReelsView } from "@/lib/reels/increment-reels-view";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  let body: {
    reelItemId?: string | null;
    storyId?: string | null;
    chapterId?: string | null;
  } = {};

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const reelItemId = body.reelItemId?.trim() ?? "";
  const storyId = body.storyId?.trim() ?? "";
  const chapterId = body.chapterId?.trim() ?? "";

  if (reelItemId && !UUID_RE.test(reelItemId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (storyId && !UUID_RE.test(storyId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (chapterId && !UUID_RE.test(chapterId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!reelItemId && (!storyId || !chapterId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await incrementReelsView({ reelItemId: reelItemId || null, storyId, chapterId });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
