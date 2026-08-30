import type { MediaUploadPurpose } from "@/lib/storage/media-paths";

export type PresignUploadResponse = {
  mediaAssetId: string;
  objectKey: string;
  bucket: string;
  uploadUrl: string;
  error?: string;
};

export type CompleteUploadResponse = {
  mediaAsset: { id: string; storage_path: string; status: string };
  resolvedUrl: string | null;
  error?: string;
};

/**
 * Client-side upload: presign → PUT to S3/MinIO → complete.
 * Use for surfaces that should not send files through Next.js body limits.
 */
export async function uploadFileViaMediaPresign(input: {
  file: File;
  purpose: MediaUploadPurpose;
  linkedEntityType?: string;
  linkedEntityId?: string;
  width?: number;
  height?: number;
}): Promise<CompleteUploadResponse> {
  const presignRes = await fetch("/api/media/presign-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: input.file.name,
      contentType: input.file.type,
      sizeBytes: input.file.size,
      purpose: input.purpose,
      linkedEntityType: input.linkedEntityType,
      linkedEntityId: input.linkedEntityId
    })
  });

  const presign = (await presignRes.json()) as PresignUploadResponse;
  if (!presignRes.ok || !presign.uploadUrl || !presign.mediaAssetId) {
    throw new Error(presign.error ?? "Không thể tạo link upload.");
  }

  const putRes = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": input.file.type },
    body: input.file
  });

  if (!putRes.ok) {
    throw new Error("Upload lên storage thất bại.");
  }

  const completeRes = await fetch("/api/media/complete-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mediaAssetId: presign.mediaAssetId,
      objectKey: presign.objectKey,
      width: input.width,
      height: input.height,
      sizeBytes: input.file.size
    })
  });

  const complete = (await completeRes.json()) as CompleteUploadResponse;
  if (!completeRes.ok) {
    throw new Error(complete.error ?? "Không thể hoàn tất upload.");
  }

  return complete;
}
