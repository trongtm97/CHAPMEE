import type { SupabaseClient } from "@supabase/supabase-js";
import type { RegisterStorageAssetInput } from "@/types/storage-cleanup";

export async function registerStorageAsset(
  supabase: SupabaseClient,
  input: RegisterStorageAssetInput
) {
  const now = new Date().toISOString();
  const row = {
    bucket: input.bucket,
    checksum: input.checksum ?? null,
    delete_after_at: input.deleteAfterAt ?? null,
    extension: input.extension ?? null,
    height: input.height ?? null,
    is_original: input.isOriginal ?? true,
    is_public: input.isPublic ?? false,
    last_used_at: input.status === "active" || !input.status ? now : null,
    linked_entity_id: input.linkedEntityId ?? null,
    linked_entity_type: input.linkedEntityType ?? null,
    linked_field: input.linkedField ?? null,
    metadata: input.metadata ?? {},
    mime_type: input.mimeType ?? null,
    original_filename: input.originalFilename ?? null,
    owner_id: input.ownerId ?? null,
    path: input.path,
    public_url: input.publicUrl ?? null,
    size_bytes: input.sizeBytes ?? 0,
    status: input.status ?? "active",
    updated_at: now,
    usage_type: input.usageType ?? "admin_asset",
    variants: input.variants ?? {},
    width: input.width ?? null
  };

  const { data, error } = await supabase
    .from("storage_assets")
    .upsert(row, { onConflict: "bucket,path" })
    .select("id")
    .maybeSingle();

  if (error) {
    console.warn("[storage-assets] register failed", {
      bucket: input.bucket,
      path: input.path,
      error: error.message
    });
    return { assetId: null, error: error.message };
  }

  return { assetId: data?.id ? String(data.id) : null, error: null };
}

export async function registerStorageDerivative(
  supabase: SupabaseClient,
  input: {
    assetId: string;
    bucket: string;
    path: string;
    variant: string;
    width?: number | null;
    height?: number | null;
    mimeType?: string | null;
    sizeBytes?: number;
    metadata?: Record<string, unknown>;
  }
) {
  const { error } = await supabase.from("storage_asset_derivatives").upsert(
    {
      asset_id: input.assetId,
      bucket: input.bucket,
      height: input.height ?? null,
      metadata: input.metadata ?? {},
      mime_type: input.mimeType ?? null,
      path: input.path,
      size_bytes: input.sizeBytes ?? 0,
      variant: input.variant,
      width: input.width ?? null
    },
    { onConflict: "asset_id,variant" }
  );

  if (error) {
    console.warn("[storage-assets] derivative register failed", {
      assetId: input.assetId,
      path: input.path,
      error: error.message
    });
    return { error: error.message };
  }

  return { error: null };
}

export async function linkStorageAssetToEntity(
  supabase: SupabaseClient,
  input: {
    bucket: string;
    path: string;
    entityType: string;
    entityId: string;
    field: string;
  }
) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("storage_assets")
    .update({
      last_used_at: now,
      linked_entity_id: input.entityId,
      linked_entity_type: input.entityType,
      linked_field: input.field,
      status: "active"
    })
    .eq("bucket", input.bucket)
    .eq("path", input.path);

  return { error: error?.message ?? null };
}

export async function markStorageAssetUsed(
  supabase: SupabaseClient,
  input: { bucket: string; path: string }
) {
  const { error } = await supabase
    .from("storage_assets")
    .update({ last_used_at: new Date().toISOString(), status: "active" })
    .eq("bucket", input.bucket)
    .eq("path", input.path);

  return { error: error?.message ?? null };
}

export async function unlinkStorageAssetFromEntity(
  supabase: SupabaseClient,
  input: {
    bucket?: string;
    path?: string;
    publicUrl?: string | null;
    entityType?: string;
    entityId?: string;
    field?: string;
  }
) {
  let query = supabase
    .from("storage_assets")
    .update({
      linked_entity_id: null,
      linked_entity_type: null,
      linked_field: null,
      orphan_detected_at: new Date().toISOString(),
      status: "orphan_candidate"
    });

  if (input.bucket && input.path) {
    query = query.eq("bucket", input.bucket).eq("path", input.path);
  } else if (input.publicUrl) {
    query = query.eq("public_url", input.publicUrl);
  } else if (input.entityType && input.entityId) {
    query = query
      .eq("linked_entity_type", input.entityType)
      .eq("linked_entity_id", input.entityId);
    if (input.field) {
      query = query.eq("linked_field", input.field);
    }
  } else {
    return { error: "Missing storage asset lookup fields." };
  }

  const { error } = await query;
  return { error: error?.message ?? null };
}

export async function markStorageAssetReplaced(
  supabase: SupabaseClient,
  input: {
    bucket?: string;
    path?: string;
    publicUrl?: string | null;
    replacedTtlDays: number;
  }
) {
  const deleteAfterAt = new Date(
    Date.now() + input.replacedTtlDays * 24 * 60 * 60 * 1000
  ).toISOString();
  let query = supabase
    .from("storage_assets")
    .update({
      delete_after_at: deleteAfterAt,
      linked_entity_id: null,
      linked_entity_type: null,
      linked_field: null,
      status: "replaced"
    });

  if (input.bucket && input.path) {
    query = query.eq("bucket", input.bucket).eq("path", input.path);
  } else if (input.publicUrl) {
    query = query.eq("public_url", input.publicUrl);
  } else {
    return { error: "Missing storage asset lookup fields." };
  }

  const { error } = await query;
  return { error: error?.message ?? null };
}

export async function markStorageAssetDeleted(
  supabase: SupabaseClient,
  input: { bucket?: string; path?: string; publicUrl?: string | null; assetId?: string }
) {
  let query = supabase
    .from("storage_assets")
    .update({
      deleted_at: new Date().toISOString(),
      status: "deleted"
    });

  if (input.assetId) {
    query = query.eq("id", input.assetId);
  } else if (input.bucket && input.path) {
    query = query.eq("bucket", input.bucket).eq("path", input.path);
  } else if (input.publicUrl) {
    query = query.eq("public_url", input.publicUrl);
  } else {
    return { error: "Missing storage asset lookup fields." };
  }

  const { error } = await query;
  return { error: error?.message ?? null };
}
