"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { formatFileSize } from "@/lib/verification/document-validation";
import {
  getVerificationDocumentSignedUrlAction,
  listVerificationDocumentsForAdminAction
} from "@/lib/admin/verification-document-actions";

type AdminDocument = {
  id: string;
  document_type: string;
  original_file_name: string;
  mime_type: string;
  file_size_bytes: number;
  created_at: string;
  status: string;
};

type VerificationDocumentsTabProps = {
  verificationId: string;
};

export function VerificationDocumentsTab({ verificationId }: VerificationDocumentsTabProps) {
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await listVerificationDocumentsForAdminAction(verificationId);
      setDocuments(result.documents as AdminDocument[]);
      setError(result.error);
    });
  }, [verificationId]);

  function openDocument(documentId: string) {
    startTransition(async () => {
      const result = await getVerificationDocumentSignedUrlAction(documentId);
      if (!result.url) {
        setError(result.error ?? "Không thể mở file.");
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  if (pending && documents.length === 0) {
    return <p className="text-sm text-zinc-400">Đang tải giấy tờ...</p>;
  }

  if (documents.length === 0) {
    return (
      <p className="text-sm text-zinc-400">
        Yêu cầu này chưa có file đính kèm hoặc được gửi trước khi hỗ trợ upload giấy tờ.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <ul className="space-y-2">
        {documents.map((doc) => (
          <li
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm"
            key={doc.id}
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-white">{doc.original_file_name}</p>
              <p className="text-xs text-zinc-500">
                {doc.document_type} · {doc.mime_type.startsWith("image/") ? "Ảnh" : "PDF"} ·{" "}
                {formatFileSize(Number(doc.file_size_bytes))}
              </p>
            </div>
            <Button
              className="min-h-9"
              disabled={pending}
              onClick={() => openDocument(doc.id)}
              type="button"
              variant="secondary"
            >
              Xem file
            </Button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-zinc-500">
        File mở bằng liên kết signed URL ngắn hạn. Không nhúng trực tiếp PDF/HTML trong admin.
      </p>
    </div>
  );
}
