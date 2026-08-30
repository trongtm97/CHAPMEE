import { NextResponse } from "next/server";
import { getCommentThread } from "@/lib/comments/getCommentThread";
import { createCommentRecord } from "@/lib/comments/createComment";
import { REELS_PUBLIC_PATH } from "@/lib/routes/reels-paths";
import { SYNC_SURFACES } from "@/lib/community-sync/constants";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storyId = String(searchParams.get("storyId") ?? "");
  const episodeId = String(searchParams.get("episodeId") ?? "");
  const result = await getCommentThread({
    episodeId: episodeId || null,
    storyId
  });

  return NextResponse.json({
    ...result,
    loginUrl: result.currentUserId ? null : `/login?next=${REELS_PUBLIC_PATH}`
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    content?: string;
    episodeId?: string | null;
    parentId?: string | null;
    storyId?: string;
    reelItemId?: string;
    reelSlug?: string | null;
    reelPublicCode?: string | null;
    reelHref?: string | null;
    contentSource?: "chapter" | "story";
  };

  const result = await createCommentRecord({
    content: body.content ?? "",
    episodeId: body.episodeId ?? null,
    parentId: body.parentId ?? null,
    storyId: body.storyId ?? "",
    syncSurface: SYNC_SURFACES.reels,
    reelsSync: body.reelItemId
      ? {
          storyId: body.storyId ?? "",
          reelItemId: body.reelItemId,
          chapterId: body.episodeId ?? null,
          reelSlug: body.reelSlug ?? null,
          reelPublicCode: body.reelPublicCode ?? null,
          reelHref: body.reelHref ?? null,
          contentSource: body.contentSource
        }
      : undefined
  });

  if (result.loginRequired) {
    return NextResponse.json({ loginUrl: `/login?next=${REELS_PUBLIC_PATH}` }, { status: 401 });
  }

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ commentId: result.commentId, ok: true });
}
