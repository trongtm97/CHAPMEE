import type { DatabaseClient } from "@/lib/db/types";
import {
  linkStorageAssetToEntity,
  markStorageAssetReplaced,
  markStorageAssetUsed,
  registerStorageAsset,
  unlinkStorageAssetFromEntity
} from "@/lib/storage/asset-service";
import type { RegisterStorageAssetInput } from "@/types/storage-cleanup";

export type MediaUsageType =
  | "avatar"
  | "story_cover"
  | "chapter_image"
  | "composer_block"
  | "reel_asset"
  | "temp_upload"
  | "admin_asset"
  | "article_asset"
  | "content_post_cover"
  | "verification_document";

export type RegisterMediaAssetInput = Omit<
  RegisterStorageAssetInput,
  "usageType"
> & {
  usageType: MediaUsageType;
};

export async function registerMediaAsset(
  db: DatabaseClient,
  input: RegisterMediaAssetInput
) {
  return registerStorageAsset(db, input);
}

export async function linkMediaAssetToEntity(
  db: DatabaseClient,
  input: {
    bucket: string;
    path: string;
    entityType: string;
    entityId: string;
    field: string;
  }
) {
  return linkStorageAssetToEntity(db, input);
}

export async function touchMediaAssets(
  db: DatabaseClient,
  assets: Array<{ bucket: string; path: string }>
) {
  const results = await Promise.all(
    assets.map((asset) => markStorageAssetUsed(db, asset))
  );
  return {
    error: results.find((result) => result.error)?.error ?? null
  };
}

export async function markMediaReplaced(
  db: DatabaseClient,
  input: {
    bucket?: string;
    path?: string;
    publicUrl?: string | null;
    replacedTtlDays?: number;
  }
) {
  return markStorageAssetReplaced(db, {
    ...input,
    replacedTtlDays: input.replacedTtlDays ?? 14
  });
}

export async function markMediaUnlinked(
  db: DatabaseClient,
  input: Parameters<typeof unlinkStorageAssetFromEntity>[1]
) {
  return unlinkStorageAssetFromEntity(db, input);
}
