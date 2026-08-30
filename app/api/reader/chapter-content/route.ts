import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getChapterForReader } from "@/lib/chapters/get-chapter-for-reader";
import type { EpisodeContentStorageRow } from "@/lib/chapters/episode-content-row";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getEarlyAccessReaderState } from "@/lib/monetization/early-access";
import { getPaidChapterReaderState } from "@/lib/monetization/paid-chapters";
import { recordSecurityEvent } from "@/lib/security/security-events";
import { getSecurityRequestContext } from "@/lib/security/request-context";
import { canViewPublicEpisode } from "@/lib/visibility/contentVisibility";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chapterId = searchParams.get("chapterId")?.trim();
  const prefetch = searchParams.get("prefetch") === "1";
  const turnstileToken = searchParams.get("turnstileToken");

  if (!chapterId) {
    return NextResponse.json({ error: "Missing chapterId" }, { status: 400 });
  }

  const ctx = await getSecurityRequestContext("/api/reader/chapter-content");
  const { user } = await getCurrentUser();

  const meta = await db.execute(sql`
    select
      e.id,
      e.status,
      e.episode_number,
      e.story_id,
      e.content,
      e.structured_content,
      e.content_format,
      e.content_storage_type,
      e.content_blob_format,
      e.content_object_key,
      e.content_hash,
      e.content_size_bytes,
      e.content_encoding,
      e.plain_text_preview,
      e.excerpt,
      e.word_count,
      s.status as story_status,
      s.visibility as story_visibility,
      cp.user_id as creator_user_id
    from public.episodes e
    inner join public.stories s on s.id = e.story_id
    left join public.creator_profiles cp on cp.id = s.creator_id
    where e.id = ${chapterId}::uuid
    limit 1
  `);

  const row = meta.rows[0] as
    | (EpisodeContentStorageRow & {
        status: string;
        episode_number: number;
        story_status: string;
        story_visibility: string;
        creator_user_id: string | null;
      })
    | undefined;

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const published = canViewPublicEpisode(
    row.status,
    row.story_status,
    row.story_visibility
  );

  if (!published) {
    await recordSecurityEvent({
      eventType: "content_access_denied",
      profileId: user?.id ?? null,
      ipHash: ctx.ipHash,
      userAgent: ctx.userAgent,
      path: ctx.path,
      method: "GET",
      metadata: { chapterId, reason: "unpublished" }
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (prefetch) {
    const earlyAccessState = await getEarlyAccessReaderState({
      userId: user?.id ?? null,
      storyId: row.story_id ?? "",
      chapterId,
      creatorUserId: row.creator_user_id ?? null
    });

    if (earlyAccessState.locked) {
      return NextResponse.json({
        accessStatus: "locked",
        chapterId,
        storyId: row.story_id ?? null,
        reason: "early_access"
      });
    }

    const paidState = await getPaidChapterReaderState({
      userId: user?.id ?? null,
      storyId: row.story_id ?? "",
      chapterId,
      creatorUserId: row.creator_user_id ?? null,
      episodeNumber: Number(row.episode_number),
      content: row.plain_text_preview ?? row.excerpt ?? ""
    });

    if (paidState.locked) {
      return NextResponse.json({
        accessStatus: "locked",
        chapterId,
        storyId: row.story_id ?? null,
        reason: "paid_chapter"
      });
    }
  }

  const body = await getChapterForReader({
    row,
    chapterId,
    allowFullBody: true,
    profileId: user?.id ?? null,
    path: "/api/reader/chapter-content",
    turnstileToken
  });

  if (body.blocked) {
    return NextResponse.json(
      {
        error: body.guardError ?? "Blocked",
        challengeRequired: body.challengeRequired ?? false
      },
      { status: body.challengeRequired ? 429 : 403 }
    );
  }

  return NextResponse.json({
    accessStatus: "full",
    content: body.content,
    structuredContent: body.structuredContent,
    source: body.source,
    protection: body.protection
  });
}
