"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminOrModerator } from "@/lib/auth/requireAdminOrModerator";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import {
  createImportJobRecord,
  getImportJobById,
  updateImportJob
} from "@/lib/import/pipeline/import-jobs";
import { parseImportJob } from "@/lib/import/pipeline/import-runner";
import {
  cancelImportJob,
  publishImportItems,
  skipImportItems
} from "@/lib/import/pipeline/import-publisher";
import { uploadRawImportFile } from "@/lib/import/pipeline/import-storage";
import { createAdminClient } from "@/lib/data/admin";

const ADMIN_IMPORT_PATH = "/admin/imports";

function jobDetailPath(jobId: string, query?: Record<string, string>) {
  const base = `${ADMIN_IMPORT_PATH}/${jobId}`;
  if (!query || Object.keys(query).length === 0) {
    return base;
  }
  return `${base}?${new URLSearchParams(query).toString()}`;
}

export type ImportPipelineActionState = {
  ok: boolean;
  error: string | null;
  jobId?: string;
};

export async function uploadImportFileAction(
  _prev: ImportPipelineActionState,
  formData: FormData
): Promise<ImportPipelineActionState> {
  const guard = await requireAdminOrModerator(ADMIN_IMPORT_PATH);
  if (!guard.ok || !guard.profile) {
    return { ok: false, error: guard.error ?? "Không có quyền." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Chọn file .txt, .md hoặc .json." };
  }

  const lower = file.name.toLowerCase();
  if (!lower.endsWith(".txt") && !lower.endsWith(".md") && !lower.endsWith(".json")) {
    return { ok: false, error: "Định dạng hỗ trợ: .txt, .md, .json." };
  }

  const maxBytes = 20 * 1024 * 1024;
  if (file.size > maxBytes) {
    return { ok: false, error: "File tối đa 20MB trong MVP." };
  }

  const ownerProfileId = guard.profile.id;
  const sourceName = String(formData.get("source_name") ?? "").trim() || null;
  const jobId = randomUUID();
  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    const db = createAdminClient();
    const uploaded = await uploadRawImportFile({
      importJobId: jobId,
      originalFilename: file.name,
      bytes
    });

    const job = await createImportJobRecord(db, {
      id: jobId,
      sourceName,
      sourceType: "manual_upload",
      rawBucket: uploaded.bucket,
      rawObjectKey: uploaded.objectKey,
      originalFilename: file.name,
      createdByProfileId: guard.profile.id,
      ownerProfileId,
      rightsAttestedAt: new Date().toISOString()
    });

    await logAdminAction({
      actorId: guard.profile.id,
      action: "import_pipeline.upload",
      targetType: "import_job",
      targetId: job.id,
      metadata: {
        filename: file.name,
        size_bytes: file.size,
        source_name: sourceName
      }
    });

    revalidatePath(ADMIN_IMPORT_PATH);

    const autoParse = formData.get("auto_parse") === "on";
    if (autoParse) {
      const parsed = await parseImportJob(db, job.id);
      revalidatePath(jobDetailPath(job.id));
      if (!parsed.ok) {
        redirect(
          jobDetailPath(job.id, {
            error: `Upload OK nhưng parse lỗi: ${parsed.error}`
          })
        );
      }
      redirect(
        jobDetailPath(job.id, {
          success: `Upload + parse xong (${parsed.totalItems} items, ${parsed.duplicateCount} trùng).`
        })
      );
    }

    redirect(jobDetailPath(job.id, { success: "Đã upload — bấm Parse job để tách chương." }));
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Upload thất bại."
    };
  }
}

export async function parseImportJobAction(jobId: string): Promise<ImportPipelineActionState> {
  const guard = await requireAdminOrModerator(`${ADMIN_IMPORT_PATH}/${jobId}`);
  if (!guard.ok) {
    return { ok: false, error: guard.error ?? "Không có quyền." };
  }

  const db = createAdminClient();
  const result = await parseImportJob(db, jobId);

  if (!guard.profile) {
    return { ok: false, error: "Không có profile." };
  }

  await logAdminAction({
    actorId: guard.profile.id,
    action: "import_pipeline.parse",
    targetType: "import_job",
    targetId: jobId,
    metadata: { ok: result.ok }
  });

  revalidatePath(ADMIN_IMPORT_PATH);
  revalidatePath(`${ADMIN_IMPORT_PATH}/${jobId}`);

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true, error: null, jobId };
}

export async function publishSelectedImportItemsAction(
  jobId: string,
  formData: FormData
): Promise<ImportPipelineActionState> {
  const guard = await requireAdminOrModerator(`${ADMIN_IMPORT_PATH}/${jobId}`);
  if (!guard.ok || !guard.profile) {
    redirect(jobDetailPath(jobId, { error: guard.error ?? "Không có quyền." }));
  }

  const actorProfileId = guard.profile.id;

  const itemIds = formData
    .getAll("item_id")
    .map((value) => String(value))
    .filter(Boolean);

  if (itemIds.length === 0) {
    redirect(jobDetailPath(jobId, { error: "Chọn ít nhất một item." }));
  }

  const db = createAdminClient();
  const job = await getImportJobById(db, jobId);

  if (!job) {
    redirect(jobDetailPath(jobId, { error: "Không tìm thấy job import." }));
  }

  if (job.owner_profile_id && job.owner_profile_id !== actorProfileId) {
    redirect(
      jobDetailPath(jobId, {
        error: "Job import thuộc tài khoản khác — chỉ được publish nội dung của chính bạn."
      })
    );
  }

  if (!job.owner_profile_id) {
    await updateImportJob(db, jobId, { owner_profile_id: actorProfileId });
  }

  const makePublic = formData.get("make_public") === "on";
  const result = await publishImportItems(db, jobId, {
    itemIds,
    storyStatus: "draft",
    visibility: makePublic ? "public" : "private"
  });

  if (!guard.profile) {
    return { ok: false, error: "Không có profile." };
  }

  await logAdminAction({
    actorId: guard.profile.id,
    action: "import_pipeline.publish",
    targetType: "import_job",
    targetId: jobId,
    metadata: { item_count: itemIds.length, ok: result.ok }
  });

  revalidatePath(ADMIN_IMPORT_PATH);
  revalidatePath(`${ADMIN_IMPORT_PATH}/${jobId}`);

  if (!result.ok) {
    redirect(jobDetailPath(jobId, { error: result.error }));
  }

  if (result.errors.length > 0) {
    redirect(
      jobDetailPath(jobId, {
        info: `Đã publish ${result.publishedCount} item.`,
        error: result.errors.slice(0, 3).join(" | ")
      })
    );
  }

  redirect(
    jobDetailPath(jobId, {
      success: `Publish xong: ${result.publishedCount} item.`
    })
  );
}

export async function skipSelectedImportItemsAction(
  jobId: string,
  formData: FormData
): Promise<ImportPipelineActionState> {
  const guard = await requireAdminOrModerator(`${ADMIN_IMPORT_PATH}/${jobId}`);
  if (!guard.ok) {
    return { ok: false, error: guard.error ?? "Không có quyền." };
  }

  const itemIds = formData
    .getAll("item_id")
    .map((value) => String(value))
    .filter(Boolean);

  if (itemIds.length === 0) {
    redirect(jobDetailPath(jobId, { error: "Chọn ít nhất một item để skip." }));
  }

  const db = createAdminClient();
  await skipImportItems(db, itemIds);

  revalidatePath(`${ADMIN_IMPORT_PATH}/${jobId}`);
  redirect(jobDetailPath(jobId, { success: `Đã skip ${itemIds.length} item.` }));
}

export async function parseImportJobFormAction(formData: FormData): Promise<void> {
  const jobId = String(formData.get("job_id") ?? "");
  if (!jobId) return;
  const result = await parseImportJobAction(jobId);
  if (!result.ok) {
    redirect(jobDetailPath(jobId, { error: result.error ?? "Parse thất bại." }));
  }
  redirect(
    jobDetailPath(jobId, {
      success: `Parse xong — xem danh sách items bên dưới.`
    })
  );
}

export async function cancelImportJobFormAction(formData: FormData): Promise<void> {
  const jobId = String(formData.get("job_id") ?? "");
  if (!jobId) return;
  await cancelImportJobAction(jobId);
  redirect(jobDetailPath(jobId, { info: "Job đã hủy." }));
}

export async function publishSelectedImportItemsFormAction(
  jobId: string,
  formData: FormData
): Promise<void> {
  await publishSelectedImportItemsAction(jobId, formData);
}

export async function skipSelectedImportItemsFormAction(
  jobId: string,
  formData: FormData
): Promise<void> {
  await skipSelectedImportItemsAction(jobId, formData);
}

export async function cancelImportJobAction(jobId: string): Promise<ImportPipelineActionState> {
  const guard = await requireAdminOrModerator(`${ADMIN_IMPORT_PATH}/${jobId}`);
  if (!guard.ok) {
    return { ok: false, error: guard.error ?? "Không có quyền." };
  }

  const db = createAdminClient();
  await cancelImportJob(db, jobId);

  revalidatePath(ADMIN_IMPORT_PATH);
  revalidatePath(`${ADMIN_IMPORT_PATH}/${jobId}`);
  return { ok: true, error: null, jobId };
}
