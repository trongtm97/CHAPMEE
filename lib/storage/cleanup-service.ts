"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import type {
  CleanupJobRow,
  CleanupJobsPage,
  CleanupPolicyRow,
  StorageAssetFilters,
  StorageAssetRow,
  StorageAssetsPage,
  StorageCleanupDashboard,
  StorageCleanupPageData
} from "@/types/storage-cleanup";

const ADMIN_STORAGE_RETURN_TO = "/admin/storage-cleanup";
const DEFAULT_PAGE_SIZE = 25;
const SCAN_LIMIT = 500;

type DbRecord = Record<string, unknown>;
type AssetCandidate = {
  bucket: string;
  id: string;
  linked_entity_id: string | null;
  linked_entity_type: string | null;
  linked_field: string | null;
  owner_id: string | null;
  path: string;
  public_url: string | null;
  size_bytes: number;
  status: string;
};

function numberValue(value: unknown) {
  const next = Number(value ?? 0);
  return Number.isFinite(next) ? next : 0;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function mapPolicy(row: DbRecord): CleanupPolicyRow {
  return {
    category: String(row.category ?? "retention"),
    description: stringValue(row.description),
    id: String(row.id),
    key: String(row.key),
    updatedAt: String(row.updated_at),
    value: row.value
  };
}

function mapJob(row: DbRecord): CleanupJobRow {
  return {
    affectedCount: numberValue(row.affected_count),
    bytesSaved: numberValue(row.bytes_saved),
    errorCount: numberValue(row.error_count),
    finishedAt: stringValue(row.finished_at),
    id: String(row.id),
    jobType: String(row.job_type),
    mode: row.mode as CleanupJobRow["mode"],
    scannedCount: numberValue(row.scanned_count),
    startedAt: stringValue(row.started_at),
    status: row.status as CleanupJobRow["status"],
    summary: stringValue(row.summary),
    triggeredBy: stringValue(row.triggered_by)
  };
}

function mapAsset(row: DbRecord): StorageAssetRow {
  const owner = row.profiles && typeof row.profiles === "object"
    ? (row.profiles as DbRecord)
    : null;
  return {
    bucket: String(row.bucket),
    createdAt: String(row.created_at),
    deleteAfterAt: stringValue(row.delete_after_at),
    extension: stringValue(row.extension),
    hasDerivatives: numberValue(row.derivative_count) > 0,
    id: String(row.id),
    isOriginal: Boolean(row.is_original),
    isPublic: Boolean(row.is_public),
    lastUsedAt: stringValue(row.last_used_at),
    linkedEntityId: stringValue(row.linked_entity_id),
    linkedEntityType: stringValue(row.linked_entity_type),
    linkedField: stringValue(row.linked_field),
    mimeType: stringValue(row.mime_type),
    orphanDetectedAt: stringValue(row.orphan_detected_at),
    originalFilename: stringValue(row.original_filename),
    ownerId: stringValue(row.owner_id),
    ownerUsername: owner ? stringValue(owner.username) : null,
    path: String(row.path),
    publicUrl: stringValue(row.public_url),
    quarantinedAt: stringValue(row.quarantined_at),
    sizeBytes: numberValue(row.size_bytes),
    status: row.status as StorageAssetRow["status"],
    usageType: stringValue(row.usage_type),
    variants: row.variants && typeof row.variants === "object"
      ? (row.variants as Record<string, unknown>)
      : {}
  };
}

function mapCandidate(row: DbRecord): AssetCandidate {
  return {
    bucket: String(row.bucket),
    id: String(row.id),
    linked_entity_id: stringValue(row.linked_entity_id),
    linked_entity_type: stringValue(row.linked_entity_type),
    linked_field: stringValue(row.linked_field),
    owner_id: stringValue(row.owner_id),
    path: String(row.path),
    public_url: stringValue(row.public_url),
    size_bytes: numberValue(row.size_bytes),
    status: String(row.status)
  };
}

function matchesAssetUrl(value: unknown, asset: AssetCandidate) {
  if (typeof value !== "string" || !value) {
    return false;
  }
  return value === asset.public_url || value === asset.path || value.endsWith(`/${asset.path}`);
}

async function rowExists(
  supabase: SupabaseClient,
  table: string,
  id: string
) {
  const { data, error } = await supabase.from(table).select("id").eq("id", id).maybeSingle();
  if (error) {
    return true;
  }
  return Boolean(data);
}

async function isAssetReferenced(supabase: SupabaseClient, asset: AssetCandidate) {
  if (!asset.linked_entity_type && !asset.linked_entity_id) {
    return false;
  }

  if (!asset.linked_entity_id) {
    return true;
  }

  if (asset.linked_entity_type === "profile") {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, avatar_url")
      .eq("id", asset.linked_entity_id)
      .maybeSingle();
    if (error) return true;
    return Boolean(data) && (
      asset.linked_field !== "avatar_url" || matchesAssetUrl((data as DbRecord).avatar_url, asset)
    );
  }

  if (asset.linked_entity_type === "story") {
    const { data, error } = await supabase
      .from("stories")
      .select("id, cover_url")
      .eq("id", asset.linked_entity_id)
      .maybeSingle();
    if (error) return true;
    return Boolean(data) && (
      asset.linked_field !== "cover_url" || matchesAssetUrl((data as DbRecord).cover_url, asset)
    );
  }

  if (asset.linked_entity_type === "content_post") {
    const { data, error } = await supabase
      .from("admin_content_posts")
      .select("id, cover_image_url")
      .eq("id", asset.linked_entity_id)
      .maybeSingle();
    if (error) return true;
    return Boolean(data) && (
      asset.linked_field !== "cover_url" ||
      matchesAssetUrl((data as DbRecord).cover_image_url, asset)
    );
  }

  if (asset.linked_entity_type === "verification_document") {
    const { data, error } = await supabase
      .from("account_verification_documents")
      .select("id, file_path, status")
      .eq("id", asset.linked_entity_id)
      .maybeSingle();
    if (error) return true;
    return Boolean(data) &&
      (data as DbRecord).status !== "deleted" &&
      matchesAssetUrl((data as DbRecord).file_path, asset);
  }

  if (asset.linked_entity_type === "episode") {
    return rowExists(supabase, "episodes", asset.linked_entity_id);
  }

  return true;
}

function daysPolicyValue(policies: CleanupPolicyRow[], key: string, fallback: number) {
  const policy = policies.find((item) => item.key === key);
  const value = numberValue(policy?.value);
  return value > 0 ? value : fallback;
}

async function requireStorageAdmin() {
  return requireAnyPermission(
    ["admin.settings.view", "admin.settings.update", "admin.dashboard.view"],
    { returnTo: ADMIN_STORAGE_RETURN_TO }
  );
}

async function requireStorageUpdate() {
  return requireAnyPermission(["admin.settings.update"], {
    returnTo: ADMIN_STORAGE_RETURN_TO
  });
}

async function countAssets(status?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("storage_assets")
    .select("id", { count: "exact", head: true });
  if (status) {
    query = query.eq("status", status);
  }
  const { count } = await query;
  return count ?? 0;
}

async function countAssetsIn(statuses: string[]) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("storage_assets")
    .select("id", { count: "exact", head: true })
    .in("status", statuses);
  return count ?? 0;
}

async function sumAssets(statuses?: string[]) {
  const supabase = await createClient();
  let query = supabase.from("storage_assets").select("size_bytes").limit(1000);
  if (statuses && statuses.length > 0) {
    query = query.in("status", statuses);
  }
  const { data } = await query;
  return (data ?? []).reduce((sum, row) => sum + numberValue(row.size_bytes), 0);
}

export async function getCleanupPolicies(): Promise<CleanupPolicyRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cleanup_policies")
    .select("*")
    .order("category", { ascending: true })
    .order("key", { ascending: true });
  return (data ?? []).map((row) => mapPolicy(row as DbRecord));
}

export async function getStorageAssetsPage(
  filters: StorageAssetFilters = {}
): Promise<StorageAssetsPage> {
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? DEFAULT_PAGE_SIZE));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("storage_assets")
    .select("*, profiles:owner_id(username)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.bucket) {
    query = query.eq("bucket", filters.bucket);
  }
  if (filters.entityType) {
    query = query.eq("linked_entity_type", filters.entityType);
  }
  if (filters.usageType) {
    query = query.eq("usage_type", filters.usageType);
  }
  if (filters.mimeType) {
    query = query.ilike("mime_type", `${filters.mimeType}%`);
  }
  if (filters.query) {
    const q = filters.query.replaceAll(",", " ").trim();
    if (q) {
      query = query.or(`path.ilike.%${q}%,checksum.ilike.%${q}%`);
    }
  }

  const { count, data, error } = await query;
  if (error) {
    return {
      error: error.message,
      items: [],
      page,
      pageSize,
      total: 0,
      totalPages: 1
    };
  }

  return {
    error: null,
    items: (data ?? []).map((row) => mapAsset(row as DbRecord)),
    page,
    pageSize,
    total: count ?? 0,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize))
  };
}

export async function getCleanupJobsPage(page = 1, pageSize = 20): Promise<CleanupJobsPage> {
  const supabase = await createClient();
  const safePage = Math.max(1, page);
  const safeSize = Math.min(50, Math.max(10, pageSize));
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;

  const { count, data, error } = await supabase
    .from("cleanup_jobs")
    .select("*", { count: "exact" })
    .order("started_at", { ascending: false, nullsFirst: false })
    .range(from, to);

  if (error) {
    return {
      error: error.message,
      items: [],
      page: safePage,
      pageSize: safeSize,
      total: 0,
      totalPages: 1
    };
  }

  return {
    error: null,
    items: (data ?? []).map((row) => mapJob(row as DbRecord)),
    page: safePage,
    pageSize: safeSize,
    total: count ?? 0,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / safeSize))
  };
}

async function getDashboard(): Promise<StorageCleanupDashboard> {
  const supabase = await createClient();
  const [
    totalAssets,
    activeAssets,
    orphanAssets,
    quarantinedAssets,
    pendingDeleteAssets,
    totalBytes,
    reclaimableBytes,
    largestFilesResult,
    jobsResult,
    failedJobsResult
  ] = await Promise.all([
    countAssets(),
    countAssets("active"),
    countAssetsIn(["orphan_candidate", "orphan_detected"]),
    countAssets("quarantined"),
    countAssets("pending_delete"),
    sumAssets(),
    sumAssets(["orphan_candidate", "pending_delete", "quarantined"]),
    supabase
      .from("storage_assets")
      .select("*, profiles:owner_id(username)")
      .order("size_bytes", { ascending: false })
      .limit(10),
    supabase
      .from("cleanup_jobs")
      .select("*")
      .order("started_at", { ascending: false, nullsFirst: false })
      .limit(1),
    supabase
      .from("cleanup_jobs")
      .select("*")
      .eq("status", "failed")
      .order("started_at", { ascending: false, nullsFirst: false })
      .limit(1)
  ]);

  const sample = await supabase
    .from("storage_assets")
    .select("bucket, owner_id, size_bytes, profiles:owner_id(username)")
    .order("created_at", { ascending: false })
    .limit(1000);

  const buckets = new Map<string, { bucket: string; bytes: number; count: number }>();
  const users = new Map<string, { ownerId: string | null; username: string | null; bytes: number; count: number }>();

  for (const row of sample.data ?? []) {
    const record = row as DbRecord;
    const bucket = String(record.bucket);
    const bytes = numberValue(record.size_bytes);
    const currentBucket = buckets.get(bucket) ?? { bucket, bytes: 0, count: 0 };
    currentBucket.bytes += bytes;
    currentBucket.count += 1;
    buckets.set(bucket, currentBucket);

    const ownerId = stringValue(record.owner_id);
    const owner = record.profiles && typeof record.profiles === "object"
      ? (record.profiles as DbRecord)
      : null;
    const key = ownerId ?? "unknown";
    const currentUser = users.get(key) ?? {
      bytes: 0,
      count: 0,
      ownerId,
      username: owner ? stringValue(owner.username) : null
    };
    currentUser.bytes += bytes;
    currentUser.count += 1;
    users.set(key, currentUser);
  }

  const policies = await getCleanupPolicies();
  const policyWarnings = policies.length === 0
    ? ["Cleanup policies are not initialized. Run migration 197."]
    : policies
        .filter((policy) =>
          ["enable_scheduled_cleanup", "enable_dry_run_mode"].includes(policy.key) &&
          policy.value === false
        )
        .map((policy) => `${policy.key} is disabled`);

  return {
    activeAssets,
    deletableAssets: pendingDeleteAssets,
    largestFiles: (largestFilesResult.data ?? []).map((row) => mapAsset(row as DbRecord)),
    latestFailedJob: failedJobsResult.data?.[0]
      ? mapJob(failedJobsResult.data[0] as DbRecord)
      : null,
    latestJob: jobsResult.data?.[0] ? mapJob(jobsResult.data[0] as DbRecord) : null,
    orphanAssets,
    policyWarnings,
    quarantinedAssets,
    reclaimableBytes,
    topBuckets: Array.from(buckets.values())
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 10),
    topUsers: Array.from(users.values())
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 10),
    totalAssets,
    totalBytes
  };
}

export async function getStorageCleanupPageData(
  filters: StorageAssetFilters = {}
): Promise<StorageCleanupPageData> {
  const guard = await requireStorageAdmin();
  if (!guard.ok) {
    return {
      assets: {
        error: guard.error,
        items: [],
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        total: 0,
        totalPages: 1
      },
      dashboard: {
        activeAssets: 0,
        deletableAssets: 0,
        largestFiles: [],
        latestFailedJob: null,
        latestJob: null,
        orphanAssets: 0,
        policyWarnings: [],
        quarantinedAssets: 0,
        reclaimableBytes: 0,
        topBuckets: [],
        topUsers: [],
        totalAssets: 0,
        totalBytes: 0
      },
      error: guard.error,
      jobs: {
        error: guard.error,
        items: [],
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 1
      },
      policies: []
    };
  }

  try {
    const [dashboard, policies, assets, jobs] = await Promise.all([
      getDashboard(),
      getCleanupPolicies(),
      getStorageAssetsPage(filters),
      getCleanupJobsPage(1, 20)
    ]);
    return { assets, dashboard, error: null, jobs, policies };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot load storage cleanup data.";
    return {
      assets: {
        error: message,
        items: [],
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        total: 0,
        totalPages: 1
      },
      dashboard: {
        activeAssets: 0,
        deletableAssets: 0,
        largestFiles: [],
        latestFailedJob: null,
        latestJob: null,
        orphanAssets: 0,
        policyWarnings: [message],
        quarantinedAssets: 0,
        reclaimableBytes: 0,
        topBuckets: [],
        topUsers: [],
        totalAssets: 0,
        totalBytes: 0
      },
      error: message,
      jobs: {
        error: message,
        items: [],
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 1
      },
      policies: []
    };
  }
}

export async function updateCleanupPolicyAction(input: {
  key: string;
  value: unknown;
}) {
  const guard = await requireStorageUpdate();
  if (!guard.ok) {
    return { error: guard.error, ok: false as const };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("cleanup_policies")
    .update({ updated_by: guard.context.userId, value: input.value })
    .eq("key", input.key);

  if (error) {
    return { error: error.message, ok: false as const };
  }

  await supabase.from("cleanup_audit_logs").insert({
    action: "cleanup_policy_updated",
    actor_id: guard.context.userId,
    after: { key: input.key, value: input.value },
    entity_type: "cleanup_policy",
    reason: "Admin updated storage cleanup policy"
  });

  revalidatePath(ADMIN_STORAGE_RETURN_TO);
  return { error: null, ok: true as const };
}

export async function runOrphanScanAction(input: { quarantine?: boolean } = {}) {
  const guard = input.quarantine ? await requireStorageUpdate() : await requireStorageAdmin();
  if (!guard.ok) {
    return { error: guard.error, ok: false as const };
  }

  const supabase = await createClient();
  const startedAt = new Date().toISOString();
  const mode = input.quarantine ? "quarantine" : "dry_run";
  const { data: candidates, error: candidateError } = await supabase
    .from("storage_assets")
    .select(
      "id, bucket, path, public_url, size_bytes, status, linked_entity_type, linked_entity_id, linked_field, owner_id"
    )
    .in("status", ["active", "temp", "replaced", "orphan_candidate", "orphan_detected"])
    .order("created_at", { ascending: true })
    .limit(SCAN_LIMIT);

  if (candidateError) {
    return { error: candidateError.message, ok: false as const };
  }

  const rows = ((candidates ?? []) as DbRecord[]).map(mapCandidate);
  const orphanRows: AssetCandidate[] = [];
  for (const row of rows) {
    if (!(await isAssetReferenced(supabase, row))) {
      orphanRows.push(row);
    }
  }
  const bytes = rows.reduce((sum, row) => sum + numberValue(row.size_bytes), 0);
  const reclaimableBytes = orphanRows.reduce((sum, row) => sum + row.size_bytes, 0);
  const ids = orphanRows.map((row) => row.id);
  let affected = 0;
  let status: "succeeded" | "failed" = "succeeded";
  const logs = orphanRows.slice(0, 50).map((row) => ({
    bucket: row.bucket,
    id: row.id,
    path: row.path,
    size_bytes: row.size_bytes
  }));

  if (input.quarantine && ids.length > 0) {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("storage_assets")
      .update({
        orphan_detected_at: now,
        quarantined_at: now,
        status: "pending_delete"
      })
      .in("id", ids);
    if (error) {
      status = "failed";
    } else {
      affected = ids.length;
      await supabase.from("cleanup_audit_logs").insert(
        ids.slice(0, 100).map((id) => ({
          action: "storage_asset_pending_delete",
          actor_id: guard.context?.userId ?? null,
          after: { status: "pending_delete" },
          entity_id: id,
          entity_type: "storage_asset",
          reason: "Manual orphan scan pending-delete"
        }))
      );
    }
  } else if (ids.length > 0) {
    const now = new Date().toISOString();
    await supabase
      .from("storage_assets")
      .update({
        orphan_detected_at: now,
        status: "orphan_candidate"
      })
      .in("id", ids);
    affected = ids.length;
  }

  const finishedAt = new Date().toISOString();
  const { error: jobError } = await supabase.from("cleanup_jobs").insert({
    affected_count: affected,
    bytes_saved: input.quarantine ? reclaimableBytes : 0,
    error_count: status === "failed" ? 1 : 0,
    finished_at: finishedAt,
    job_type: "orphan_scan",
    logs,
    metadata: {
      candidate_ids: ids.slice(0, 100),
      dry_run: !input.quarantine,
      scanned_bytes: bytes,
      verified_reference_check: true
    },
    mode,
    scanned_count: rows.length,
    started_at: startedAt,
    status,
    summary: input.quarantine
      ? `Marked ${affected} orphan candidates as pending delete.`
      : `Detected ${affected} orphan candidates. No files were deleted.`,
    triggered_by: guard.context?.userId ?? null
  });

  if (jobError) {
    return { error: jobError.message, ok: false as const };
  }

  revalidatePath(ADMIN_STORAGE_RETURN_TO);
  return {
    affectedCount: affected,
    bytesSaved: input.quarantine ? reclaimableBytes : 0,
    error: null,
    ok: true as const,
    scannedCount: rows.length
  };
}

export async function runHardDeleteDryRunAction() {
  const guard = await requireStorageUpdate();
  if (!guard.ok) {
    return { error: guard.error, ok: false as const };
  }

  const supabase = await createClient();
  const startedAt = new Date().toISOString();
  const policies = await getCleanupPolicies();
  const minAgeHours = daysPolicyValue(policies, "min_age_before_delete_hours", 24);
  const cutoff = new Date(Date.now() - minAgeHours * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("storage_assets")
    .select(
      "id, bucket, path, public_url, size_bytes, status, linked_entity_type, linked_entity_id, linked_field, owner_id"
    )
    .eq("status", "pending_delete")
    .lte("delete_after_at", new Date().toISOString())
    .lte("updated_at", cutoff)
    .order("delete_after_at", { ascending: true })
    .limit(SCAN_LIMIT);

  if (error) {
    return { error: error.message, ok: false as const };
  }

  const rows = ((data ?? []) as DbRecord[]).map(mapCandidate);
  const deletable: AssetCandidate[] = [];
  for (const row of rows) {
    if (!(await isAssetReferenced(supabase, row))) {
      deletable.push(row);
    }
  }

  const bytes = deletable.reduce((sum, row) => sum + row.size_bytes, 0);
  const finishedAt = new Date().toISOString();
  const { error: jobError } = await supabase.from("cleanup_jobs").insert({
    affected_count: deletable.length,
    bytes_saved: 0,
    error_count: 0,
    finished_at: finishedAt,
    job_type: "hard_delete_dry_run",
    logs: deletable.slice(0, 50).map((row) => ({
      bucket: row.bucket,
      id: row.id,
      path: row.path,
      size_bytes: row.size_bytes
    })),
    metadata: {
      cutoff,
      dry_run: true,
      potential_bytes_saved: bytes,
      min_age_hours: minAgeHours
    },
    mode: "hard_delete",
    scanned_count: rows.length,
    started_at: startedAt,
    status: "succeeded",
    summary: `Hard-delete dry-run found ${deletable.length} pending-delete assets eligible after ${minAgeHours} hours. No files were deleted.`,
    triggered_by: guard.context?.userId ?? null
  });

  if (jobError) {
    return { error: jobError.message, ok: false as const };
  }

  revalidatePath(ADMIN_STORAGE_RETURN_TO);
  return {
    affectedCount: deletable.length,
    bytesSaved: bytes,
    error: null,
    ok: true as const,
    scannedCount: rows.length
  };
}

export async function executePendingDeleteCleanupAction(input: { confirmText: string }) {
  const guard = await requireStorageUpdate();
  if (!guard.ok) {
    return { error: guard.error, ok: false as const };
  }
  if (input.confirmText !== "DELETE PENDING MEDIA") {
    return { error: "Confirmation text does not match.", ok: false as const };
  }

  const supabase = await createClient();
  const startedAt = new Date().toISOString();
  const policies = await getCleanupPolicies();
  const batchSize = Math.min(500, Math.max(1, daysPolicyValue(policies, "cleanup_batch_size", 100)));
  const minAgeHours = daysPolicyValue(policies, "min_age_before_delete_hours", 24);
  const cutoff = new Date(Date.now() - minAgeHours * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("storage_assets")
    .select(
      "id, bucket, path, public_url, size_bytes, status, linked_entity_type, linked_entity_id, linked_field, owner_id"
    )
    .eq("status", "pending_delete")
    .lte("delete_after_at", now)
    .lte("updated_at", cutoff)
    .order("delete_after_at", { ascending: true })
    .limit(batchSize);

  if (error) {
    return { error: error.message, ok: false as const };
  }

  const rows = ((data ?? []) as DbRecord[]).map(mapCandidate);
  const deletable: AssetCandidate[] = [];
  for (const row of rows) {
    if (!(await isAssetReferenced(supabase, row))) {
      deletable.push(row);
    }
  }

  let errorCount = 0;
  let deletedCount = 0;
  let bytesSaved = 0;
  const logs: DbRecord[] = [];
  const byBucket = new Map<string, AssetCandidate[]>();
  for (const asset of deletable) {
    byBucket.set(asset.bucket, [...(byBucket.get(asset.bucket) ?? []), asset]);
  }

  for (const [bucket, assets] of byBucket.entries()) {
    const { error: removeError } = await supabase.storage
      .from(bucket)
      .remove(assets.map((asset) => asset.path));
    if (removeError) {
      errorCount += assets.length;
      logs.push({ bucket, error: removeError.message, paths: assets.map((asset) => asset.path) });
      continue;
    }

    const ids = assets.map((asset) => asset.id);
    const { error: updateError } = await supabase
      .from("storage_assets")
      .update({ deleted_at: now, status: "deleted" })
      .in("id", ids);

    if (updateError) {
      errorCount += assets.length;
      logs.push({ bucket, error: updateError.message, ids });
      continue;
    }

    deletedCount += assets.length;
    bytesSaved += assets.reduce((sum, asset) => sum + asset.size_bytes, 0);
    logs.push(...assets.slice(0, 50).map((asset) => ({
      bucket,
      id: asset.id,
      path: asset.path,
      size_bytes: asset.size_bytes
    })));

    await supabase.from("cleanup_audit_logs").insert(
      ids.slice(0, 100).map((id) => ({
        action: "storage_asset_deleted",
        actor_id: guard.context?.userId ?? null,
        after: { status: "deleted" },
        entity_id: id,
        entity_type: "storage_asset",
        reason: "Confirmed pending-delete cleanup"
      }))
    );
  }

  const status = errorCount > 0 ? "failed" : "succeeded";
  const { error: jobError } = await supabase.from("cleanup_jobs").insert({
    affected_count: deletedCount,
    bytes_saved: bytesSaved,
    error_count: errorCount,
    finished_at: new Date().toISOString(),
    job_type: "media_cleanup_pending_delete",
    logs: logs.slice(0, 100),
    metadata: { confirmed: true, min_age_hours: minAgeHours },
    mode: "hard_delete",
    scanned_count: rows.length,
    started_at: startedAt,
    status,
    summary: `Deleted ${deletedCount} pending-delete media assets from storage.`,
    triggered_by: guard.context?.userId ?? null
  });

  if (jobError) {
    return { error: jobError.message, ok: false as const };
  }

  revalidatePath(ADMIN_STORAGE_RETURN_TO);
  return {
    affectedCount: deletedCount,
    bytesSaved,
    error: errorCount > 0 ? "Some assets could not be deleted. Check job logs." : null,
    ok: errorCount === 0,
    scannedCount: rows.length
  } as const;
}

export async function rebuildStorageMetricsAction() {
  const guard = await requireStorageUpdate();
  if (!guard.ok) {
    return { error: guard.error, ok: false as const };
  }

  const supabase = await createClient();
  const startedAt = new Date().toISOString();
  const [total, active, orphan, quarantined, deleted, totalBytes, reclaimableBytes] =
    await Promise.all([
      countAssets(),
      countAssets("active"),
      countAssetsIn(["orphan_candidate", "orphan_detected"]),
      countAssets("quarantined"),
      countAssets("deleted"),
      sumAssets(),
      sumAssets(["orphan_candidate", "orphan_detected", "pending_delete", "quarantined"])
    ]);
  const metricDate = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from("daily_storage_metrics").upsert(
    {
      active_assets: active,
      date: metricDate,
      deleted_bytes: 0,
      orphan_assets: orphan,
      orphan_bytes: reclaimableBytes,
      quarantined_assets: quarantined,
      total_assets: total,
      total_bytes: totalBytes
    },
    { onConflict: "date" }
  );

  if (error) {
    return { error: error.message, ok: false as const };
  }

  const finishedAt = new Date().toISOString();
  await supabase.from("cleanup_jobs").insert({
    affected_count: 1,
    bytes_saved: 0,
    error_count: 0,
    finished_at: finishedAt,
    job_type: "storage_metrics_rollup",
    logs: [],
    metadata: { deleted_assets: deleted, metric_date: metricDate },
    mode: "rollup",
    scanned_count: total,
    started_at: startedAt,
    status: "succeeded",
    summary: `Rebuilt storage metrics for ${metricDate}.`,
    triggered_by: guard.context?.userId ?? null
  });

  revalidatePath(ADMIN_STORAGE_RETURN_TO);
  return { error: null, ok: true as const };
}

export async function runDraftVersionCleanupAction(input: { dryRun?: boolean } = {}) {
  const guard = input.dryRun ? await requireStorageAdmin() : await requireStorageUpdate();
  if (!guard.ok) {
    return { error: guard.error, ok: false as const };
  }

  const supabase = await createClient();
  const policies = await getCleanupPolicies();
  const ttlDays = daysPolicyValue(policies, "autosave_ttl_days", 14);
  const maxVersions = daysPolicyValue(policies, "max_autosave_versions_per_entity", 20);
  const cutoff = new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000).toISOString();
  const startedAt = new Date().toISOString();
  const { data: oldRows, error } = await supabase
    .from("creator_draft_versions")
    .select("id, draft_id")
    .lt("created_at", cutoff)
    .limit(1000);

  if (error) {
    return { error: error.message, ok: false as const };
  }

  const candidateIds = new Set((oldRows ?? []).map((row) => String((row as DbRecord).id)));
  const draftIds = Array.from(
    new Set((oldRows ?? []).map((row) => stringValue((row as DbRecord).draft_id)).filter(Boolean))
  ) as string[];

  for (const draftId of draftIds.slice(0, 100)) {
    const { data: extraRows } = await supabase
      .from("creator_draft_versions")
      .select("id")
      .eq("draft_id", draftId)
      .order("version_number", { ascending: false })
      .range(maxVersions, maxVersions + 200);
    for (const row of extraRows ?? []) {
      candidateIds.add(String((row as DbRecord).id));
    }
  }

  let affected = 0;
  if (!input.dryRun && candidateIds.size > 0) {
    const { error: deleteError } = await supabase
      .from("creator_draft_versions")
      .delete()
      .in("id", Array.from(candidateIds));
    if (deleteError) {
      return { error: deleteError.message, ok: false as const };
    }
    affected = candidateIds.size;
  } else {
    affected = candidateIds.size;
  }

  await supabase.from("cleanup_jobs").insert({
    affected_count: affected,
    bytes_saved: 0,
    error_count: 0,
    finished_at: new Date().toISOString(),
    job_type: "autosave_cleanup",
    logs: [],
    metadata: {
      cutoff,
      dry_run: Boolean(input.dryRun),
      max_versions_per_entity: maxVersions,
      ttl_days: ttlDays
    },
    mode: input.dryRun ? "dry_run" : "hard_delete",
    scanned_count: (oldRows ?? []).length,
    started_at: startedAt,
    status: "succeeded",
    summary: input.dryRun
      ? `Draft version cleanup dry-run found ${affected} old versions.`
      : `Deleted ${affected} old draft versions.`,
    triggered_by: guard.context?.userId ?? null
  });

  await supabase.from("cleanup_audit_logs").insert({
    action: input.dryRun ? "draft_version_cleanup_dry_run" : "draft_version_cleanup",
    actor_id: guard.context?.userId ?? null,
    after: { affected_count: affected, dry_run: Boolean(input.dryRun) },
    entity_type: "creator_draft_versions",
    reason: "Admin ran autosave/version cleanup"
  });

  revalidatePath(ADMIN_STORAGE_RETURN_TO);
  return { affectedCount: affected, error: null, ok: true as const };
}

export async function markAssetActiveAction(assetId: string) {
  const guard = await requireStorageUpdate();
  if (!guard.ok) {
    return { error: guard.error, ok: false as const };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("storage_assets")
    .update({
      last_used_at: new Date().toISOString(),
      orphan_detected_at: null,
      quarantined_at: null,
      status: "active"
    })
    .eq("id", assetId);
  if (error) {
    return { error: error.message, ok: false as const };
  }
  await supabase.from("cleanup_audit_logs").insert({
    action: "storage_asset_marked_active",
    actor_id: guard.context.userId,
    after: { status: "active" },
    entity_id: assetId,
    entity_type: "storage_asset",
    reason: "Admin restored/marked active"
  });
  revalidatePath(ADMIN_STORAGE_RETURN_TO);
  return { error: null, ok: true as const };
}
