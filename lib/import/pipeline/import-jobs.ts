import type { DatabaseClient } from "@/lib/db/types";
import type {
  ImportItemRow,
  ImportJobRow,
  ImportJobSourceType,
  ImportJobStatus
} from "@/types/import-pipeline";

export async function getImportJobById(
  db: DatabaseClient,
  jobId: string
): Promise<ImportJobRow | null> {
  const { data, error } = await db
    .from("import_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as ImportJobRow | null) ?? null;
}

export async function listImportJobs(
  db: DatabaseClient,
  options?: { limit?: number }
): Promise<ImportJobRow[]> {
  const { data, error } = await db
    .from("import_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 50);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ImportJobRow[];
}

export async function listImportItemsForJob(
  db: DatabaseClient,
  jobId: string
): Promise<ImportItemRow[]> {
  const { data, error } = await db
    .from("import_items")
    .select("*")
    .eq("import_job_id", jobId);

  if (error) {
    throw new Error(error.message);
  }

  const items = (data ?? []) as ImportItemRow[];
  return items.sort((a, b) => {
    if (a.item_type !== b.item_type) {
      return a.item_type === "story" ? -1 : 1;
    }
    const an = a.chapter_number ?? 0;
    const bn = b.chapter_number ?? 0;
    return an - bn;
  });
}

export async function updateImportJob(
  db: DatabaseClient,
  jobId: string,
  patch: Partial<ImportJobRow> & { status?: ImportJobStatus }
) {
  const { error } = await db
    .from("import_jobs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", jobId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateImportItem(
  db: DatabaseClient,
  itemId: string,
  patch: Partial<ImportItemRow>
) {
  const { error } = await db
    .from("import_items")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", itemId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function createImportJobRecord(
  db: DatabaseClient,
  input: {
    id?: string;
    sourceName: string | null;
    sourceType: ImportJobSourceType;
    rawBucket: string;
    rawObjectKey: string;
    originalFilename: string;
    createdByProfileId: string | null;
    ownerProfileId: string | null;
    rightsAttestedAt: string | null;
  }
) {
  const row = {
    ...(input.id ? { id: input.id } : {}),
    source_name: input.sourceName,
    source_type: input.sourceType,
    raw_bucket: input.rawBucket,
    raw_object_key: input.rawObjectKey,
    original_filename: input.originalFilename,
    status: "uploaded" as const,
    created_by_profile_id: input.createdByProfileId,
    owner_profile_id: input.ownerProfileId,
    rights_attested_at: input.rightsAttestedAt
  };

  const { data, error } = await db
    .from("import_jobs")
    .insert(row)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Không tạo được import job.");
  }

  return data as ImportJobRow;
}
