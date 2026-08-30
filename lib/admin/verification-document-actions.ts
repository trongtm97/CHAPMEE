"use server";

import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { assertAnyPermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/data/server";
import { VERIFICATION_STORAGE_BUCKET } from "@/lib/verification/config";
import { logVerificationAudit } from "@/lib/verification/log-verification-audit";

export async function getVerificationDocumentSignedUrlAction(documentId: string) {
  try {
    await assertAnyPermission(["admin.user.view", "admin.user.update"]);
    const ctx = await getCurrentAuthContext();
    const db = await createClient();

    const { data: doc } = await db
      .from("account_verification_documents")
      .select("id, file_path, request_id, user_id, original_file_name, mime_type")
      .eq("id", documentId)
      .eq("status", "uploaded")
      .maybeSingle();

    if (!doc) {
      return { error: "Không tìm thấy file.", url: null };
    }

    const { data, error } = await db.storage
      .from(VERIFICATION_STORAGE_BUCKET)
      .createSignedUrl(doc.file_path, 300);

    if (error || !data?.signedUrl) {
      return { error: "Không thể mở file.", url: null };
    }

    await logVerificationAudit({
      action: "verification_document_viewed",
      actorId: ctx?.userId ?? "unknown",
      actorRole: "admin",
      metadata: {
        document_id: documentId,
        original_file_name: doc.original_file_name
      },
      requestId: doc.request_id,
      userId: doc.user_id
    });

    return { error: null, url: data.signedUrl };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Không có quyền xem file.",
      url: null
    };
  }
}

export async function listVerificationDocumentsForAdminAction(requestId: string) {
  try {
    await assertAnyPermission(["admin.user.view", "admin.user.update"]);
    const db = await createClient();
    const { data } = await db
      .from("account_verification_documents")
      .select("id, document_type, original_file_name, mime_type, file_size_bytes, created_at, status")
      .eq("request_id", requestId)
      .eq("status", "uploaded")
      .order("created_at", { ascending: true });

    return { documents: data ?? [], error: null };
  } catch (error) {
    return {
      documents: [],
      error: error instanceof Error ? error.message : "Không thể tải danh sách file."
    };
  }
}
