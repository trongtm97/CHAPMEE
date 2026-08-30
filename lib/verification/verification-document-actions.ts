"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { createClient } from "@/lib/data/server";
import { registerStorageAsset } from "@/lib/storage/asset-service";
import {
  isStudioVerificationType,
  VERIFICATION_STORAGE_BUCKET,
  type StudioVerificationType
} from "@/lib/verification/config";
import {
  validateVerificationBatch,
  validateVerificationFile
} from "@/lib/verification/document-validation";
import {
  areVerificationRequestsEnabled,
  getUserVerificationSummary
} from "@/lib/verification/get-user-verification";
import { logVerificationAudit } from "@/lib/verification/log-verification-audit";
import { syncProfileVerificationCache } from "@/lib/verification/sync-profile-cache";
import type { VerificationDocumentRow } from "@/types/verification";

function extensionFromName(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx === -1 ? "bin" : name.slice(idx + 1).toLowerCase();
}

function toDocumentRow(row: Record<string, unknown>): VerificationDocumentRow {
  return {
    createdAt: String(row.created_at),
    documentType: String(row.document_type),
    fileSizeBytes: Number(row.file_size_bytes),
    id: String(row.id),
    mimeType: String(row.mime_type),
    originalFileName: String(row.original_file_name),
    requestId: (row.request_id as string | null) ?? null,
    status: row.status as VerificationDocumentRow["status"],
    uploadSessionId: (row.upload_session_id as string | null) ?? null
  };
}

export async function uploadVerificationDocumentAction(formData: FormData) {
  const ctx = await getCurrentAuthContext();
  if (!ctx?.userId) {
    return { error: "Bạn cần đăng nhập.", ok: false as const };
  }

  const file = formData.get("file");
  const documentType = String(formData.get("documentType") ?? "").trim();
  const uploadSessionId = String(formData.get("uploadSessionId") ?? "").trim();
  const requestId = String(formData.get("requestId") ?? "").trim() || null;
  const verificationType = String(formData.get("verificationType") ?? "").trim();

  if (!(file instanceof File)) {
    return { error: "Không tìm thấy file.", ok: false as const };
  }

  if (!documentType || !uploadSessionId) {
    return { error: "Thiếu thông tin upload.", ok: false as const };
  }

  if (verificationType && !isStudioVerificationType(verificationType)) {
    return { error: "Loại xác thực không hợp lệ.", ok: false as const };
  }

  const validation = validateVerificationFile({
    documentType,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size
  });

  if (!validation.ok) {
    return { error: validation.error, ok: false as const };
  }

  const db = await createClient();

  if (requestId) {
    const { data: request } = await db
      .from("account_verifications")
      .select("id, user_id, status")
      .eq("id", requestId)
      .maybeSingle();

    if (!request || request.user_id !== ctx.userId) {
      return { error: "Không tìm thấy yêu cầu xác thực.", ok: false as const };
    }

    if (!["needs_more_info", "pending"].includes(String(request.status))) {
      return { error: "Không thể bổ sung file cho yêu cầu này.", ok: false as const };
    }
  } else {
    const summary = await getUserVerificationSummary(ctx.userId);
    if (summary.latestPending) {
      return { error: "Bạn đã có yêu cầu đang chờ duyệt.", ok: false as const };
    }
  }

  const { data: existingDocs } = await db
    .from("account_verification_documents")
    .select("file_size_bytes")
    .eq("user_id", ctx.userId)
    .eq("status", "uploaded")
    .or(
      requestId
        ? `request_id.eq.${requestId}`
        : `upload_session_id.eq.${uploadSessionId},request_id.is.null`
    );

  const currentCount = existingDocs?.length ?? 0;
  const currentBytes = (existingDocs ?? []).reduce((sum, row) => sum + Number(row.file_size_bytes), 0);
  const batchCheck = validateVerificationBatch(currentBytes + file.size, currentCount + 1);
  if (!batchCheck.ok) {
    return { error: batchCheck.error, ok: false as const };
  }

  const ext = extensionFromName(file.name);
  const randomName = `${randomUUID()}.${ext}`;
  const folderKey = requestId ?? uploadSessionId;
  const filePath = `${ctx.userId}/${folderKey}/${documentType}/${randomName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await db.storage
    .from(VERIFICATION_STORAGE_BUCKET)
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: false
    });

  if (uploadError) {
    return { error: "Không thể tải file lên. Vui lòng thử lại.", ok: false as const };
  }

  const { data: inserted, error: insertError } = await db
    .from("account_verification_documents")
    .insert({
      document_type: documentType,
      file_path: filePath,
      file_size_bytes: file.size,
      mime_type: file.type,
      original_file_name: file.name,
      request_id: requestId,
      upload_session_id: uploadSessionId,
      user_id: ctx.userId
    })
    .select("*")
    .single();

  if (insertError || !inserted) {
    await db.storage.from(VERIFICATION_STORAGE_BUCKET).remove([filePath]);
    return { error: "Không thể lưu thông tin file.", ok: false as const };
  }
  await registerStorageAsset(db, {
    bucket: VERIFICATION_STORAGE_BUCKET,
    isOriginal: true,
    isPublic: false,
    linkedEntityId: String(inserted.id),
    linkedEntityType: "verification_document",
    linkedField: "file_path",
    metadata: {
      document_type: documentType,
      module: "verification_document",
      request_id: requestId,
      upload_session_id: uploadSessionId
    },
    mimeType: file.type,
    ownerId: ctx.userId,
    originalFilename: file.name,
    path: filePath,
    sizeBytes: file.size,
    extension: ext,
    usageType: "verification_document"
  });

  await logVerificationAudit({
    action: "verification_document_uploaded",
    actorId: ctx.userId,
    actorRole: "user",
    metadata: {
      document_id: inserted.id,
      document_type: documentType,
      file_size_bytes: file.size,
      mime_type: file.type
    },
    requestId,
    userId: ctx.userId
  });

  return {
    document: toDocumentRow(inserted as Record<string, unknown>),
    error: null,
    ok: true as const
  };
}

export async function deleteVerificationDocumentAction(documentId: string) {
  const ctx = await getCurrentAuthContext();
  if (!ctx?.userId) {
    return { error: "Bạn cần đăng nhập.", ok: false as const };
  }

  const db = await createClient();
  const { data: doc } = await db
    .from("account_verification_documents")
    .select("*")
    .eq("id", documentId)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (!doc) {
    return { error: "Không tìm thấy file.", ok: false as const };
  }

  if (doc.request_id) {
    const { data: request } = await db
      .from("account_verifications")
      .select("status")
      .eq("id", doc.request_id)
      .maybeSingle();

    if (request && !["needs_more_info", "pending"].includes(String(request.status))) {
      return { error: "Không thể xóa file của yêu cầu đã xử lý.", ok: false as const };
    }
  }

  await db.storage.from(VERIFICATION_STORAGE_BUCKET).remove([doc.file_path]);
  await db
    .from("account_verification_documents")
    .update({ status: "deleted" })
    .eq("id", documentId);
  await db
    .from("storage_assets")
    .update({ deleted_at: new Date().toISOString(), status: "deleted" })
    .eq("bucket", VERIFICATION_STORAGE_BUCKET)
    .eq("path", doc.file_path);

  await logVerificationAudit({
    action: "verification_document_deleted",
    actorId: ctx.userId,
    actorRole: "user",
    metadata: { document_id: documentId, document_type: doc.document_type },
    requestId: doc.request_id,
    userId: ctx.userId
  });

  return { error: null, ok: true as const };
}

export async function submitVerificationRequestAction(input: {
  verificationType: StudioVerificationType;
  requestReason: string;
  consent: boolean;
  uploadSessionId: string;
  requestId?: string | null;
}) {
  const ctx = await getCurrentAuthContext();
  if (!ctx?.userId) {
    return { error: "Bạn cần đăng nhập.", ok: false as const };
  }

  // Implicit consent: submitting a verification request implies consent (see UI notice).

  if (!isStudioVerificationType(input.verificationType)) {
    return { error: "Loại xác thực không hợp lệ.", ok: false as const };
  }

  const enabled = await areVerificationRequestsEnabled();
  if (!enabled) {
    return { error: "Hệ thống chưa mở nhận yêu cầu xác thực.", ok: false as const };
  }

  const reason = input.requestReason.trim();
  if (reason.length < 20) {
    return { error: "Vui lòng mô tả lý do xác thực (tối thiểu 20 ký tự).", ok: false as const };
  }

  const db = await createClient();
  const sessionId = input.uploadSessionId.trim();

  const { data: sessionDocs } = await db
    .from("account_verification_documents")
    .select("*")
    .eq("user_id", ctx.userId)
    .eq("status", "uploaded")
    .or(
      input.requestId
        ? `request_id.eq.${input.requestId},upload_session_id.eq.${sessionId}`
        : `upload_session_id.eq.${sessionId},request_id.is.null`
    );

  const docs = sessionDocs ?? [];

  const totalBytes = docs.reduce((sum, doc) => sum + Number(doc.file_size_bytes), 0);
  const batchCheck = validateVerificationBatch(totalBytes, docs.length);
  if (!batchCheck.ok) {
    return { error: batchCheck.error, ok: false as const };
  }

  let requestId = input.requestId ?? null;

  if (requestId) {
    const { data: existing } = await db
      .from("account_verifications")
      .select("*")
      .eq("id", requestId)
      .eq("user_id", ctx.userId)
      .maybeSingle();

    if (!existing || existing.status !== "needs_more_info") {
      return { error: "Không thể bổ sung yêu cầu này.", ok: false as const };
    }
  } else {
    const summary = await getUserVerificationSummary(ctx.userId);
    if (summary.latestPending) {
      return { error: "Bạn đã có yêu cầu đang chờ duyệt.", ok: false as const };
    }

    const now = new Date().toISOString();
    const { data: created, error: createError } = await db
      .from("account_verifications")
      .insert({
        display_badge: true,
        request_reason: reason,
        source: "studio",
        status: "pending",
        submitted_at: now,
        user_id: ctx.userId,
        verification_type: input.verificationType
      })
      .select("id")
      .single();

    if (createError || !created) {
      return { error: createError?.message ?? "Không thể tạo yêu cầu.", ok: false as const };
    }

    requestId = created.id;
  }

  await db
    .from("account_verification_documents")
    .update({ request_id: requestId, upload_session_id: null })
    .in(
      "id",
      docs.map((doc) => doc.id)
    );

  const now = new Date().toISOString();

  if (input.requestId) {
    await db
      .from("account_verifications")
      .update({
        request_reason: reason,
        status: "pending",
        submitted_at: now,
        updated_at: now
      })
      .eq("id", requestId);
  }

  await logVerificationAudit({
    action: input.requestId ? "verification_resubmitted" : "verification_submitted",
    actorId: ctx.userId,
    actorRole: "user",
    metadata: {
      document_count: docs.length,
      verification_type: input.verificationType
    },
    requestId,
    userId: ctx.userId
  });

  await syncProfileVerificationCache(ctx.userId);
  revalidatePath("/studio/settings/verification");
  revalidatePath("/admin/verifications");

  return { error: null, ok: true as const, requestId };
}

export async function listVerificationDocumentsAction(input: {
  uploadSessionId?: string;
  requestId?: string | null;
}) {
  const ctx = await getCurrentAuthContext();
  if (!ctx?.userId) {
    return { documents: [], error: "Bạn cần đăng nhập." };
  }

  const db = await createClient();
  let query = db
    .from("account_verification_documents")
    .select("*")
    .eq("user_id", ctx.userId)
    .eq("status", "uploaded")
    .order("created_at", { ascending: true });

  if (input.requestId) {
    query = query.eq("request_id", input.requestId);
  } else if (input.uploadSessionId) {
    query = query.eq("upload_session_id", input.uploadSessionId).is("request_id", null);
  } else {
    return { documents: [], error: null };
  }

  const { data } = await query;
  return {
    documents: (data ?? []).map((row) => toDocumentRow(row as Record<string, unknown>)),
    error: null
  };
}
