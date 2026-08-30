import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  containsForbiddenLocalMediaUrl,
  getMediaUrlFromAsset,
  type MediaAssetRef
} from "@/lib/media/media-url";
import { buildCanonicalUrl, getDefaultOgImage, resolvePublicUrl } from "@/lib/seo/metadata";

type StorageAssetRow = MediaAssetRef & {
  id: string;
};

const assetUrlCache = new Map<string, string | null>();

/** Resolve public CDN URL for a storage_assets / media_assets id. Never returns localhost. */
export async function resolveMediaAssetPublicUrl(
  assetId: string | null | undefined
): Promise<string | null> {
  const id = assetId?.trim();
  if (!id) {
    return null;
  }

  if (assetUrlCache.has(id)) {
    return assetUrlCache.get(id) ?? null;
  }

  let url: string | null = null;

  try {
    const result = await db.execute(sql`
      select
        id,
        bucket,
        path as storage_path,
        status,
        is_public
      from public.storage_assets
      where id = ${id}::uuid
      limit 1
    `);

    const row = result.rows[0] as StorageAssetRow | undefined;
    if (row && row.status !== "deleted" && row.status !== "failed") {
      url = getMediaUrlFromAsset(row);
    }
  } catch {
    url = null;
  }

  if (url && containsForbiddenLocalMediaUrl(url)) {
    url = null;
  }

  assetUrlCache.set(id, url);
  return url;
}

export async function resolveMediaAssetPublicUrls(
  assetIds: Array<string | null | undefined>
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(assetIds.map((id) => id?.trim()).filter(Boolean))] as string[];

  await Promise.all(
    unique.map(async (id) => {
      const url = await resolveMediaAssetPublicUrl(id);
      if (url) {
        map.set(id, url);
      }
    })
  );

  return map;
}

/** True when URL is safe for OG/Twitter/canonical (no localhost / raw uploads). */
export function isSafeMetadataUrl(value: string | null | undefined): boolean {
  const cleaned = value?.trim();
  if (!cleaned) {
    return false;
  }

  if (containsForbiddenLocalMediaUrl(cleaned)) {
    return false;
  }

  if (cleaned.startsWith("/")) {
    return true;
  }

  try {
    const url = new URL(cleaned);
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) {
      return false;
    }
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Resolve OG/Twitter image URL: asset id → entity URL → default brand asset. */
export async function resolveSeoImageUrl(input: {
  assetId?: string | null;
  entityUrl?: string | null;
  defaultAssetId?: string | null;
}): Promise<string | null> {
  if (input.assetId) {
    const fromAsset = await resolveMediaAssetPublicUrl(input.assetId);
    if (fromAsset && isSafeMetadataUrl(fromAsset)) {
      return fromAsset;
    }
  }

  if (input.entityUrl) {
    const resolved = resolvePublicUrl(input.entityUrl);
    if (resolved && isSafeMetadataUrl(resolved)) {
      return resolved;
    }
  }

  if (input.defaultAssetId) {
    const fromDefault = await resolveMediaAssetPublicUrl(input.defaultAssetId);
    if (fromDefault && isSafeMetadataUrl(fromDefault)) {
      return fromDefault;
    }
  }

  const fallbackPath = getDefaultOgImage();
  const absolute = buildCanonicalUrl(fallbackPath);
  if (absolute && isSafeMetadataUrl(absolute)) {
    return absolute;
  }

  return fallbackPath.startsWith("/") ? fallbackPath : null;
}

/** Clear in-memory asset URL cache (tests / long-lived dev servers). */
export function clearSeoMediaAssetCache() {
  assetUrlCache.clear();
}
