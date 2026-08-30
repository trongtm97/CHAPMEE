import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  buildMediaObjectKey,
  mediaFolderForPurpose,
  type MediaUploadPurpose
} from "@/lib/storage/media-paths";
import { getMediaS3Bucket } from "@/lib/storage/s3";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif"
]);

const MAX_FILENAME_LENGTH = 200;

const PURPOSE_MAX_BYTES: Record<MediaUploadPurpose, number> = {
  avatar: 5 * 1024 * 1024,
  story_cover: 8 * 1024 * 1024,
  chapter_image: 10 * 1024 * 1024,
  composer_image: 10 * 1024 * 1024,
  reel_background: 10 * 1024 * 1024,
  seo_og: 8 * 1024 * 1024,
  temp: 20 * 1024 * 1024
};

const PURPOSE_USAGE: Record<MediaUploadPurpose, string> = {
  avatar: "avatar",
  story_cover: "story_cover",
  chapter_image: "chapter_image",
  composer_image: "composer_block",
  reel_background: "reel_asset",
  seo_og: "seo_og_image",
  temp: "temp_upload"
};

const PURPOSE_LINKED_TYPE: Partial<Record<MediaUploadPurpose, string>> = {
  avatar: "avatar",
  story_cover: "story_cover",
  chapter_image: "chapter_image",
  composer_image: "composer_image",
  reel_background: "reel_background",
  seo_og: "seo_settings",
  temp: "temp"
};

export type MediaAssetRow = {
  id: string;
  owner_id: string | null;
  bucket: string;
  storage_path: string;
  status: string;
};

export function validateMediaUploadInput(input: {
  contentType: string;
  filename: string;
  purpose: MediaUploadPurpose;
  sizeBytes?: number;
}) {
  if (!ALLOWED_MIME.has(input.contentType)) {
    throw new Error("Unsupported content type");
  }
  if (input.filename.length > MAX_FILENAME_LENGTH) {
    throw new Error("Filename too long");
  }
  const maxBytes = PURPOSE_MAX_BYTES[input.purpose];
  if (input.sizeBytes !== undefined && input.sizeBytes > maxBytes) {
    throw new Error("File too large");
  }
}

export async function createPendingMediaAsset(input: {
  ownerProfileId: string;
  purpose: MediaUploadPurpose;
  filename: string;
  mimeType: string;
  sizeBytes?: number;
  linkedEntityType?: string | null;
  linkedEntityId?: string | null;
  bucket?: string;
}) {
  validateMediaUploadInput({
    contentType: input.mimeType,
    filename: input.filename,
    purpose: input.purpose,
    sizeBytes: input.sizeBytes
  });

  const folder = mediaFolderForPurpose(input.purpose);
  const objectKey = buildMediaObjectKey(folder, input.filename);
  const usageType = PURPOSE_USAGE[input.purpose];
  const bucket = input.bucket ?? getMediaS3Bucket();
  const deleteAfter =
    input.purpose === "temp" ? sql`now() + interval '3 days'` : sql`null`;

  const result = await db.execute(sql`
    insert into public.storage_assets (
      owner_id,
      bucket,
      path,
      original_filename,
      mime_type,
      size_bytes,
      status,
      usage_type,
      linked_entity_type,
      linked_entity_id,
      is_public,
      delete_after_at
    )
    values (
      ${input.ownerProfileId}::uuid,
      ${bucket},
      ${objectKey},
      ${input.filename},
      ${input.mimeType},
      ${input.sizeBytes ?? 0},
      'uploading',
      ${usageType},
      ${input.linkedEntityType ?? PURPOSE_LINKED_TYPE[input.purpose] ?? null},
      ${input.linkedEntityId ?? null}::uuid,
      true,
      ${deleteAfter}
    )
    returning id, owner_id, bucket, path as storage_path, status
  `);

  const row = result.rows[0] as MediaAssetRow | undefined;
  if (!row) {
    throw new Error("Could not create media asset");
  }

  return { asset: row, objectKey, bucket };
}

export async function completeMediaAsset(input: {
  assetId: string;
  ownerProfileId: string;
  objectKey?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
}) {
  const result = await db.execute(sql`
    update public.storage_assets
    set
      status = 'active',
      width = coalesce(${input.width ?? null}, width),
      height = coalesce(${input.height ?? null}, height),
      size_bytes = coalesce(${input.sizeBytes ?? null}, size_bytes),
      updated_at = now(),
      last_used_at = now()
    where id = ${input.assetId}::uuid
      and owner_id = ${input.ownerProfileId}::uuid
      and (${input.objectKey ?? null}::text is null or path = ${input.objectKey ?? null})
    returning id, owner_id, bucket, path as storage_path, status
  `);

  const row = result.rows[0] as MediaAssetRow | undefined;
  if (!row) {
    throw new Error("Media asset not found");
  }

  return row;
}

/**
 * Promote an asset referenced as the site's default OG image so it becomes a
 * permanent, library-visible asset. Safe for assets uploaded as `temp` (clears
 * the auto-delete window and relabels usage) and no-op for already-permanent
 * assets (e.g. a story cover picked from the library).
 */
export async function promoteSeoOgImageAsset(assetId: string): Promise<void> {
  const id = assetId?.trim();
  if (!id) {
    return;
  }

  await db.execute(sql`
    update public.storage_assets
    set
      status = case
        when status in (
          'uploading', 'temp', 'replaced', 'quarantined',
          'orphan_candidate', 'orphan_detected', 'pending_delete'
        ) then 'active'
        else status
      end,
      delete_after_at = null,
      usage_type = case when usage_type = 'temp_upload' then 'seo_og_image' else usage_type end,
      linked_entity_type = coalesce(linked_entity_type, 'seo_settings'),
      updated_at = now(),
      last_used_at = now()
    where id = ${id}::uuid
  `);
}
