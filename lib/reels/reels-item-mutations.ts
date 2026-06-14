import type { DatabaseClient } from "@/lib/db/types";
import { validateReelsContent } from "@/lib/reels/validate-reels-item";
import { generateNumericPublicCode } from "@/lib/urls/public-code";
import { resolveContentSlug } from "@/lib/urls/slug";
import { getReelUrl } from "@/lib/urls/paths";
import {
  loadReelsContentObject,
  saveReelsContentObject
} from "@/lib/storage/reels-content-storage";
import type { ReelsFormValues, ReelsSourceType } from "@/types/reels";

type ReelsDbRow = {
  id: string;
  owner_id: string;
  title: string | null;
  hook: string | null;
  body: string | null;
  cta: string | null;
  content_storage_type?: string | null;
  content_object_key?: string | null;
  content_hash?: string | null;
  content_encoding?: string | null;
  content_size_bytes?: number | null;
  content_blob_format?: string | null;
  content_updated_at?: string | null;
  body_preview?: string | null;
};

async function persistReelsTextToS3(
  db: DatabaseClient,
  reelId: string,
  input: {
    title: string | null;
    hook: string | null;
    body: string | null;
    cta: string | null;
    previousObjectKey?: string | null;
  }
) {
  const saved = await saveReelsContentObject({
    body: input.body,
    cta: input.cta,
    hook: input.hook,
    previousObjectKey: input.previousObjectKey ?? null,
    reelId,
    title: input.title
  });

  await db
    .from("reels_items")
    .update({
      body: null,
      body_preview: saved.bodyPreview,
      content_blob_format: saved.blobFormat,
      content_encoding: saved.encoding,
      content_hash: saved.hash,
      content_object_key: saved.objectKey,
      content_size_bytes: saved.sizeBytes,
      content_storage_type: "s3",
      content_updated_at: new Date().toISOString(),
      cta: null,
      hook: null,
      title: null
    })
    .eq("id", reelId);
}

async function loadReelsTextFromS3(
  db: DatabaseClient,
  reelId: string
): Promise<{ title: string | null; hook: string | null; body: string | null; cta: string | null } | null> {
  const { data, error } = await db
    .from("reels_items")
    .select("content_object_key, content_hash, content_encoding, content_storage_type")
    .eq("id", reelId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as Pick<
    ReelsDbRow,
    "content_object_key" | "content_hash" | "content_encoding" | "content_storage_type"
  >;
  if (row.content_storage_type !== "s3" || !row.content_object_key) return null;
  const loaded = await loadReelsContentObject({
    expectedHash: row.content_hash ?? undefined,
    objectKey: row.content_object_key
  });
  return {
    body: loaded.envelope.body,
    cta: loaded.envelope.cta,
    hook: loaded.envelope.hook,
    title: loaded.envelope.title
  };
}

export async function insertReelsItem(
  db: DatabaseClient,
  ownerId: string,
  values: Partial<ReelsFormValues>,
  extra?: {
    sourceType?: ReelsSourceType | null;
    sourceTextStart?: number | null;
    sourceTextEnd?: number | null;
    status?: string;
    scheduledAt?: string | null;
  }
) {
  const validation = validateReelsContent(values, "draft");

  if (!validation.ok || !validation.values) {
    return { error: validation.errors.join(" "), id: null };
  }

  const publicCode = await generateNumericPublicCode(db, "reel");
  const slug = resolveContentSlug(
    validation.values.title || validation.values.hook,
    "reel",
    publicCode
  );
  const canonicalPath = getReelUrl({ slug, public_code: publicCode });

  const { data, error } = await db
    .from("reels_items")
    .insert({
      background_image_url: validation.values.backgroundImageUrl,
      chapter_id: validation.values.chapterId,
      cta_type: validation.values.ctaType,
      owner_id: ownerId,
      public_code: publicCode,
      slug,
      canonical_path: canonicalPath,
      scheduled_at: extra?.scheduledAt ?? null,
      source_text_end: extra?.sourceTextEnd ?? null,
      source_text_start: extra?.sourceTextStart ?? null,
      source_type: extra?.sourceType ?? "manual",
      status: extra?.status ?? "draft",
      story_id: validation.values.storyId || null
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Không luu du?c reel.", id: null };
  }

  const reelId = data.id as string;

  try {
    await persistReelsTextToS3(db, reelId, {
      body: validation.values.body,
      cta: validation.values.cta,
      hook: validation.values.hook,
      title: validation.values.title
    });
  } catch (s3Error) {
    // Roll back the row if S3 write failed to keep DB consistent.
    await db.from("reels_items").delete().eq("id", reelId);
    return {
      error:
        s3Error instanceof Error
          ? `Không lưu được Reels text lên S3: ${s3Error.message}`
          : "Không lưu được Reels text lên S3.",
      id: null
    };
  }

  return { error: null, id: reelId };
}

export async function updateReelsItemRow(
  db: DatabaseClient,
  reelId: string,
  ownerId: string,
  values: Partial<ReelsFormValues>,
  extra?: {
    sourceType?: ReelsSourceType | null;
    sourceTextStart?: number | null;
    sourceTextEnd?: number | null;
    status?: string;
    scheduledAt?: string | null;
    publishedAt?: string | null;
  }
) {
  const validation = validateReelsContent(values, "draft");

  if (!validation.ok || !validation.values) {
    return { error: validation.errors.join(" "), ok: false as const };
  }

  const textChanged =
    "title" in values ||
    "hook" in values ||
    "body" in values ||
    "cta" in values;

  const { data: existing, error: readError } = await db
    .from("reels_items")
    .select("id, content_object_key")
    .eq("id", reelId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (readError) {
    return { error: readError.message, ok: false as const };
  }
  if (!existing) {
    return { error: "Không tìm thấy Reels.", ok: false as const };
  }

  if (textChanged) {
    await persistReelsTextToS3(db, reelId, {
      body: validation.values.body,
      cta: validation.values.cta,
      hook: validation.values.hook,
      previousObjectKey:
        (existing as { content_object_key?: string | null }).content_object_key ?? null,
      title: validation.values.title
    });
  }

  const patch: Record<string, unknown> = {
    background_image_url: validation.values.backgroundImageUrl,
    chapter_id: validation.values.chapterId,
    cta_type: validation.values.ctaType,
    published_at: extra?.publishedAt,
    scheduled_at: extra?.scheduledAt,
    source_text_end: extra?.sourceTextEnd ?? null,
    source_text_start: extra?.sourceTextStart ?? null,
    source_type: extra?.sourceType,
    status: extra?.status,
    story_id: validation.values.storyId || null
  };

  const { error } = await db
    .from("reels_items")
    .update(patch)
    .eq("id", reelId)
    .eq("owner_id", ownerId);

  if (error) {
    return { error: error.message, ok: false as const };
  }

  return { ok: true as const };
}

export async function duplicateReelsItem(
  db: DatabaseClient,
  ownerId: string,
  reelId: string
) {
  const { data: source, error: readError } = await db
    .from("reels_items")
    .select(
      "id, background_image_url, chapter_id, cta_type, story_id, content_object_key, content_storage_type, content_hash, content_encoding, content_blob_format, content_size_bytes, body_preview, title, hook, body, cta"
    )
    .eq("id", reelId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (readError || !source) {
    return { error: readError?.message ?? "Không tìm th?y Reels.", id: null };
  }

  // Resolve current text: prefer S3 envelope; fallback to legacy inline fields.
  let resolvedText: { title: string | null; hook: string | null; body: string | null; cta: string | null } = {
    body: (source as { body?: string | null }).body ?? null,
    cta: (source as { cta?: string | null }).cta ?? null,
    hook: (source as { hook?: string | null }).hook ?? null,
    title: (source as { title?: string | null }).title ?? null
  };
  if (
    (source as ReelsDbRow).content_storage_type === "s3" &&
    (source as ReelsDbRow).content_object_key
  ) {
    const fromS3 = await loadReelsTextFromS3(db, reelId);
    if (fromS3) resolvedText = fromS3;
  }

  const hook = resolvedText.hook?.startsWith("Bản sao")
    ? resolvedText.hook
    : `Bản sao — ${resolvedText.hook ?? ""}`;

  const { data, error } = await db
    .from("reels_items")
    .insert({
      background_image_url: (source as { background_image_url?: string | null }).background_image_url ?? null,
      chapter_id: (source as { chapter_id?: string | null }).chapter_id ?? null,
      cta_type: (source as { cta_type?: string | null }).cta_type ?? null,
      owner_id: ownerId,
      source_type: "manual",
      status: "draft",
      story_id: (source as { story_id?: string | null }).story_id ?? null
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Không luu du?c reel.", id: null };
  }

  const newReelId = data.id as string;

  try {
    await persistReelsTextToS3(db, newReelId, {
      body: resolvedText.body,
      cta: resolvedText.cta,
      hook: hook.slice(0, 80),
      title: resolvedText.title
        ? `Bản sao — ${resolvedText.title}`
        : null
    });
  } catch (s3Error) {
    await db.from("reels_items").delete().eq("id", newReelId);
    return {
      error:
        s3Error instanceof Error
          ? `Không lưu được Reels text lên S3: ${s3Error.message}`
          : "Không lưu được Reels text lên S3.",
      id: null
    };
  }

  return { error: null, id: newReelId };
}

export async function loadReelsItemTextForRead(
  db: DatabaseClient,
  reelId: string
): Promise<{ title: string | null; hook: string | null; body: string | null; cta: string | null } | null> {
  return loadReelsTextFromS3(db, reelId);
}
