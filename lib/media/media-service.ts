import type { SupabaseClient } from "@supabase/supabase-js";
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
  supabase: SupabaseClient,
  input: RegisterMediaAssetInput
) {
  return registerStorageAsset(supabase, input);
}

export async function linkMediaAssetToEntity(
  supabase: SupabaseClient,
  input: {
    bucket: string;
    path: string;
    entityType: string;
    entityId: string;
    field: string;
  }
) {
  return linkStorageAssetToEntity(supabase, input);
}

export async function touchMediaAssets(
  supabase: SupabaseClient,
  assets: Array<{ bucket: string; path: string }>
) {
  const results = await Promise.all(
    assets.map((asset) => markStorageAssetUsed(supabase, asset))
  );
  return {
    error: results.find((result) => result.error)?.error ?? null
  };
}

export async function markMediaReplaced(
  supabase: SupabaseClient,
  input: {
    bucket?: string;
    path?: string;
    publicUrl?: string | null;
    replacedTtlDays?: number;
  }
) {
  return markStorageAssetReplaced(supabase, {
    ...input,
    replacedTtlDays: input.replacedTtlDays ?? 14
  });
}

export async function markMediaUnlinked(
  supabase: SupabaseClient,
  input: Parameters<typeof unlinkStorageAssetFromEntity>[1]
) {
  return unlinkStorageAssetFromEntity(supabase, input);
}
