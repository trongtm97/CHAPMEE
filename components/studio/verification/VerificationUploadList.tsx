"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { formatFileSize } from "@/lib/verification/document-validation";
import {
  IDENTITY_DOCUMENT_TYPES_NOTE,
  STUDIO_VERIFICATION_TYPE_CONFIG,
  VERIFICATION_FILE_LIMITS,
  VERIFICATION_IMAGE_ONLY_DOCUMENT_TYPES,
  type StudioVerificationType,
  type VerificationDocumentDefinition
} from "@/lib/verification/config";
import {
  deleteVerificationDocumentAction,
  uploadVerificationDocumentAction
} from "@/lib/verification/verification-document-actions";
import type { VerificationDocumentRow } from "@/types/verification";

type VerificationUploadListProps = {
  verificationType: StudioVerificationType;
  uploadSessionId: string;
  requestId?: string | null;
  documents: VerificationDocumentRow[];
  disabled?: boolean;
  onDocumentsChange: (documents: VerificationDocumentRow[]) => void;
  onError?: (message: string) => void;
};

const IDENTITY_GROUP_LABELS: Record<string, string> = {
  identity: "Giấy tờ định danh (CCCD hoặc giấy phép lái xe)",
  representative_identity: "Giấy tờ định danh người đại diện (CCCD hoặc GPLX)"
};

function acceptForDocument(documentId: string): string {
  if (
    VERIFICATION_IMAGE_ONLY_DOCUMENT_TYPES.includes(
      documentId as (typeof VERIFICATION_IMAGE_ONLY_DOCUMENT_TYPES)[number]
    )
  ) {
    return "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
  }
  return ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf";
}

export function VerificationUploadList({
  disabled,
  documents,
  onDocumentsChange,
  onError,
  requestId,
  uploadSessionId,
  verificationType
}: VerificationUploadListProps) {
  const config = STUDIO_VERIFICATION_TYPE_CONFIG[verificationType];
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const shownGroups = new Set<string>();

  function docsForType(documentType: string) {
    return documents.filter((doc) => doc.documentType === documentType);
  }

  function handlePickFile(documentType: string) {
    inputRefs.current[documentType]?.click();
  }

  function handleFileChange(documentType: string, event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setUploadingType(documentType);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("documentType", documentType);
      formData.set("uploadSessionId", uploadSessionId);
      formData.set("verificationType", verificationType);
      if (requestId) {
        formData.set("requestId", requestId);
      }

      const result = await uploadVerificationDocumentAction(formData);
      setUploadingType(null);

      if (!result.ok || !result.document) {
        onError?.(result.error ?? "Không thể tải file lên.");
        return;
      }

      onDocumentsChange([
        ...documents.filter((doc) => doc.id !== result.document!.id),
        result.document
      ]);
    });
  }

  function handleDelete(documentId: string) {
    startTransition(async () => {
      const result = await deleteVerificationDocumentAction(documentId);
      if (!result.ok) {
        onError?.(result.error ?? "Không thể xóa file.");
        return;
      }
      onDocumentsChange(documents.filter((doc) => doc.id !== documentId));
    });
  }

  function renderGroupHeader(docDef: VerificationDocumentDefinition) {
    if (!docDef.group || shownGroups.has(docDef.group)) {
      return null;
    }
    shownGroups.add(docDef.group);
    const label = IDENTITY_GROUP_LABELS[docDef.group] ?? docDef.group;
    return (
      <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-xs leading-5 text-cyan-100/90">
        <p className="font-semibold text-cyan-200">{label}</p>
        <p className="mt-1 text-zinc-400">{IDENTITY_DOCUMENT_TYPES_NOTE}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-white">Bước 2 · Tải giấy tờ</p>
      <p className="text-xs text-zinc-500">
        Tất cả mục đều tuỳ chọn — bạn chỉ cần gửi những gì có sẵn. JPG, PNG, WEBP, PDF · tối đa
        10MB/file · tối đa {VERIFICATION_FILE_LIMITS.maxFilesPerRequest} file · tổng 40MB/yêu cầu
      </p>

      {config.documents.map((docDef) => {
        const uploaded = docsForType(docDef.id);
        const isUploading = uploadingType === docDef.id;

        return (
          <div className="space-y-3" key={docDef.id}>
            {renderGroupHeader(docDef)}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-zinc-100">{docDef.label}</p>
                  <p className="mt-1 text-xs text-zinc-500">{docDef.description}</p>
                </div>
                <span className="text-xs text-zinc-500">
                  {uploaded.length > 0 ? "Đã upload" : "Tuỳ chọn"}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  className="min-h-10"
                  disabled={disabled || isUploading}
                  loading={isUploading}
                  onClick={() => handlePickFile(docDef.id)}
                  type="button"
                  variant="secondary"
                >
                  Chọn file
                </Button>
                <input
                  accept={acceptForDocument(docDef.id)}
                  className="hidden"
                  disabled={disabled}
                  onChange={(event) => handleFileChange(docDef.id, event)}
                  ref={(node) => {
                    inputRefs.current[docDef.id] = node;
                  }}
                  type="file"
                />
              </div>

              {uploaded.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {uploaded.map((doc) => (
                    <li
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2 text-sm"
                      key={doc.id}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-zinc-200">{doc.originalFileName}</p>
                        <p className="text-xs text-zinc-500">
                          {doc.mimeType.startsWith("image/") ? "Ảnh" : "PDF"} ·{" "}
                          {formatFileSize(doc.fileSizeBytes)}
                        </p>
                      </div>
                      <Button
                        className="min-h-9 shrink-0"
                        disabled={disabled}
                        onClick={() => handleDelete(doc.id)}
                        type="button"
                        variant="ghost"
                      >
                        Xóa
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
