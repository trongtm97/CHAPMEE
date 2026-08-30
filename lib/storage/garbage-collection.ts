import "server-only";

import type { DatabaseClient } from "@/lib/db/types";
import { getImportRetentionDays } from "@/lib/import/pipeline/import-cleanup-policy";
import { getImportRawBucket } from "@/lib/import/pipeline/import-object-keys";
import { IMPORT_CLEANUP_POLICY } from "@/types/import-pipeline";
import { deleteObject } from "@/lib/storage/s3";

const STALE_UPLOADING_HOURS = 24;
const STUDIO_JOB_RETENTION_DAYS = IMPORT_CLEANUP_POLICY.importLogsRetentionDays;
const PENDING_DELETE_BATCH = 100;

export type GarbageCollectionSectionResult = {
  deleted: number;
  errors: string[];
  scanned: number;
  skippedDryRun: number;
};

export type StorageGarbageCollectionResult = {
  dryRun: boolean;
  importArtifacts: GarbageCollectionSectionResult;
  pendingDeleteMedia: GarbageCollectionSectionResult;
  staleUploads: GarbageCollectionSectionResult;
  studioJobHistory: GarbageCollectionSectionResult;
};

function emptySection(): GarbageCollectionSectionResult {
  return { deleted: 0, errors: [], scanned: 0, skippedDryRun: 0 };
}

function matchesAssetPath(value: unknown, path: string, publicUrl: string | null) {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }
  return value === publicUrl || value === path || value.endsWith(`/${path}`);
}

async function isUploadAssetStillReferenced(
  db: DatabaseClient,
  asset: {
    id: string;
    path: string;
    public_url: string | null;
    linked_entity_type: string | null;
    linked_entity_id: string | null;
    linked_field: string | null;
  }
) {
  if (!asset.linked_entity_id || !asset.linked_entity_type) {
    return false;
  }

  if (asset.linked_entity_type === "profile") {
    const { data } = await db
      .from("profiles")
      .select("avatar_url")
      .eq("id", asset.linked_entity_id)
      .maybeSingle();
    return Boolean(
      data &&
        (asset.linked_field !== "avatar_url" ||
          matchesAssetPath(data.avatar_url, asset.path, asset.public_url))
    );
  }

  if (asset.linked_entity_type === "story") {
    const { data } = await db
      .from("stories")
      .select("cover_url")
      .eq("id", asset.linked_entity_id)
      .maybeSingle();
    return Boolean(
      data &&
        (asset.linked_field !== "cover_url" ||
          matchesAssetPath(data.cover_url, asset.path, asset.public_url))
    );
  }

  if (asset.linked_entity_type === "episode") {
    const { data } = await db
      .from("episodes")
      .select("id")
      .eq("id", asset.linked_entity_id)
      .maybeSingle();
    return Boolean(data);
  }

  return true;
}

async function deleteStorageAsset(
  db: DatabaseClient,
  asset: { id: string; bucket: string; path: string },
  dryRun: boolean
) {
  if (dryRun) {
    return;
  }

  try {
    await deleteObject(asset.path, asset.bucket);
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : `Không xóa được ${asset.path}`
    );
  }

  const { error } = await db
    .from("storage_assets")
    .update({
      deleted_at: new Date().toISOString(),
      status: "deleted"
    })
    .eq("id", asset.id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function cleanupImportArtifacts(
  db: DatabaseClient,
  options: { dryRun?: boolean } = {}
): Promise<GarbageCollectionSectionResult> {
  const dryRun = options.dryRun ?? false;
  const result = emptySection();
  const rawDays = getImportRetentionDays("raw_failed");
  const processedDays = getImportRetentionDays("processed_temp");
  const textBucket = getImportRawBucket();
  const rawCutoff = new Date(
    Date.now() - rawDays * 24 * 60 * 60 * 1000
  ).toISOString();
  const processedCutoff = new Date(
    Date.now() - processedDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: failedJobs, error: failedError } = await db
    .from("import_jobs")
    .select("id, raw_object_key")
    .in("status", ["failed", "cancelled"])
    .lt("created_at", rawCutoff)
    .not("raw_object_key", "is", null)
    .limit(500);

  if (failedError) {
    result.errors.push(failedError.message);
    return result;
  }

  for (const job of failedJobs ?? []) {
    const key = String(job.raw_object_key ?? "").trim();
    if (!key) {
      continue;
    }

    result.scanned += 1;
    if (dryRun) {
      result.skippedDryRun += 1;
      continue;
    }

    try {
      await deleteObject(key, textBucket);
      await db
        .from("import_jobs")
        .update({ raw_object_key: null })
        .eq("id", job.id);
      result.deleted += 1;
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : `Không xóa raw import ${job.id}`
      );
    }
  }

  const { data: publishedJobs, error: publishedJobsError } = await db
    .from("import_jobs")
    .select("id")
    .eq("status", "published")
    .limit(2000);

  if (publishedJobsError) {
    result.errors.push(publishedJobsError.message);
    return result;
  }

  const publishedJobIds = (publishedJobs ?? []).map((row) => String(row.id));
  if (publishedJobIds.length === 0) {
    return result;
  }

  const { data: processedItems, error: processedError } = await db
    .from("import_items")
    .select("id, parsed_content_object_key, import_job_id")
    .in("import_job_id", publishedJobIds)
    .not("parsed_content_object_key", "is", null)
    .eq("status", "published")
    .lt("updated_at", processedCutoff)
    .limit(500);

  if (processedError) {
    result.errors.push(processedError.message);
    return result;
  }

  for (const item of processedItems ?? []) {
    const key = String(item.parsed_content_object_key ?? "").trim();
    if (!key) {
      continue;
    }

    result.scanned += 1;
    if (dryRun) {
      result.skippedDryRun += 1;
      continue;
    }

    try {
      await deleteObject(key, textBucket);
      await db
        .from("import_items")
        .update({ parsed_content_object_key: null })
        .eq("id", item.id);
      result.deleted += 1;
    } catch (error) {
      result.errors.push(
        error instanceof Error
          ? error.message
          : `Không xóa processed import ${item.id}`
      );
    }
  }

  return result;
}

export async function cleanupStaleUploads(
  db: DatabaseClient,
  options: { dryRun?: boolean } = {}
): Promise<GarbageCollectionSectionResult> {
  const dryRun = options.dryRun ?? false;
  const result = emptySection();
  const uploadingCutoff = new Date(
    Date.now() - STALE_UPLOADING_HOURS * 60 * 60 * 1000
  ).toISOString();
  const now = new Date().toISOString();

  const { data: candidates, error } = await db
    .from("storage_assets")
    .select(
      "id, bucket, path, public_url, status, linked_entity_type, linked_entity_id, linked_field, created_at, delete_after_at"
    )
    .in("status", ["uploading", "temp", "error"])
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) {
    result.errors.push(error.message);
    return result;
  }

  for (const row of candidates ?? []) {
    const status = String(row.status);
    const createdAt = String(row.created_at);
    const deleteAfterAt = row.delete_after_at ? String(row.delete_after_at) : null;
    const expiredTemp = Boolean(deleteAfterAt && deleteAfterAt <= now);
    const staleUploading =
      status === "uploading" && createdAt < uploadingCutoff;
    const staleError = status === "error";

    if (!expiredTemp && !staleUploading && !staleError) {
      continue;
    }

    result.scanned += 1;

    const stillReferenced = await isUploadAssetStillReferenced(db, {
      id: String(row.id),
      linked_entity_id: row.linked_entity_id as string | null,
      linked_entity_type: row.linked_entity_type as string | null,
      linked_field: row.linked_field as string | null,
      path: String(row.path),
      public_url: row.public_url as string | null
    });

    if (stillReferenced) {
      continue;
    }

    if (dryRun) {
      result.skippedDryRun += 1;
      continue;
    }

    try {
      await deleteStorageAsset(
        db,
        {
          bucket: String(row.bucket),
          id: String(row.id),
          path: String(row.path)
        },
        false
      );
      result.deleted += 1;
    } catch (caught) {
      result.errors.push(
        caught instanceof Error ? caught.message : `Không xóa upload ${row.id}`
      );
    }
  }

  return result;
}

export async function cleanupPendingDeleteMedia(
  db: DatabaseClient,
  options: { dryRun?: boolean; batchSize?: number } = {}
): Promise<GarbageCollectionSectionResult> {
  const dryRun = options.dryRun ?? false;
  const batchSize = options.batchSize ?? PENDING_DELETE_BATCH;
  const result = emptySection();
  const minAgeCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const { data, error } = await db
    .from("storage_assets")
    .select(
      "id, bucket, path, public_url, linked_entity_type, linked_entity_id, linked_field"
    )
    .eq("status", "pending_delete")
    .lte("delete_after_at", now)
    .lte("updated_at", minAgeCutoff)
    .is("deleted_at", null)
    .order("delete_after_at", { ascending: true })
    .limit(batchSize);

  if (error) {
    result.errors.push(error.message);
    return result;
  }

  for (const row of data ?? []) {
    result.scanned += 1;
    const stillReferenced = await isUploadAssetStillReferenced(db, {
      id: String(row.id),
      linked_entity_id: row.linked_entity_id as string | null,
      linked_entity_type: row.linked_entity_type as string | null,
      linked_field: row.linked_field as string | null,
      path: String(row.path),
      public_url: row.public_url as string | null
    });

    if (stillReferenced) {
      continue;
    }

    if (dryRun) {
      result.skippedDryRun += 1;
      continue;
    }

    try {
      await deleteStorageAsset(
        db,
        {
          bucket: String(row.bucket),
          id: String(row.id),
          path: String(row.path)
        },
        false
      );
      result.deleted += 1;
    } catch (caught) {
      result.errors.push(
        caught instanceof Error ? caught.message : `Không xóa pending ${row.id}`
      );
    }
  }

  return result;
}

export async function purgeStudioImportExportJobHistory(
  db: DatabaseClient,
  options: { dryRun?: boolean } = {}
): Promise<GarbageCollectionSectionResult> {
  const dryRun = options.dryRun ?? false;
  const result = emptySection();
  const cutoff = new Date(
    Date.now() - STUDIO_JOB_RETENTION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await db
    .from("studio_import_export_jobs")
    .select("id")
    .in("status", ["completed", "failed", "partially_completed"])
    .lt("completed_at", cutoff)
    .limit(500);

  if (error) {
    result.errors.push(error.message);
    return result;
  }

  const ids = (data ?? []).map((row) => String(row.id));
  result.scanned = ids.length;

  if (ids.length === 0) {
    return result;
  }

  if (dryRun) {
    result.skippedDryRun = ids.length;
    return result;
  }

  const { error: deleteError } = await db
    .from("studio_import_export_jobs")
    .delete()
    .in("id", ids);

  if (deleteError) {
    result.errors.push(deleteError.message);
    return result;
  }

  result.deleted = ids.length;
  return result;
}

export async function runStorageGarbageCollection(
  db: DatabaseClient,
  options: { dryRun?: boolean } = {}
): Promise<StorageGarbageCollectionResult> {
  const dryRun = options.dryRun ?? false;

  const [importArtifacts, staleUploads, pendingDeleteMedia, studioJobHistory] =
    await Promise.all([
      cleanupImportArtifacts(db, { dryRun }),
      cleanupStaleUploads(db, { dryRun }),
      cleanupPendingDeleteMedia(db, { dryRun }),
      purgeStudioImportExportJobHistory(db, { dryRun })
    ]);

  if (!dryRun) {
    await db.from("cleanup_jobs").insert({
      affected_count:
        importArtifacts.deleted +
        staleUploads.deleted +
        pendingDeleteMedia.deleted +
        studioJobHistory.deleted,
      bytes_saved: 0,
      error_count:
        importArtifacts.errors.length +
        staleUploads.errors.length +
        pendingDeleteMedia.errors.length +
        studioJobHistory.errors.length,
      finished_at: new Date().toISOString(),
      job_type: "scheduled_garbage_collection",
      logs: {
        importArtifacts,
        pendingDeleteMedia,
        staleUploads,
        studioJobHistory
      },
      metadata: { dry_run: false },
      mode: "hard_delete",
      scanned_count:
        importArtifacts.scanned +
        staleUploads.scanned +
        pendingDeleteMedia.scanned +
        studioJobHistory.scanned,
      started_at: new Date().toISOString(),
      status:
        importArtifacts.errors.length +
          staleUploads.errors.length +
          pendingDeleteMedia.errors.length +
          studioJobHistory.errors.length >
        0
          ? "failed"
          : "succeeded",
      summary: "Scheduled storage garbage collection"
    });
  }

  return {
    dryRun,
    importArtifacts,
    pendingDeleteMedia,
    staleUploads,
    studioJobHistory
  };
}
