import {
  VERIFICATION_ALLOWED_EXTENSIONS,
  VERIFICATION_ALLOWED_MIME_TYPES,
  VERIFICATION_FILE_LIMITS,
  VERIFICATION_IMAGE_MIME_TYPES,
  VERIFICATION_IMAGE_ONLY_DOCUMENT_TYPES
} from "@/lib/verification/config";

const BLOCKED_EXTENSIONS = [
  ".svg",
  ".html",
  ".htm",
  ".js",
  ".exe",
  ".zip",
  ".rar",
  ".docm",
  ".doc",
  ".xls",
  ".xlsx"
];

export type VerificationFileValidationResult =
  | { ok: true }
  | { ok: false; error: string };

function extensionOf(name: string): string {
  const idx = name.lastIndexOf(".");
  if (idx === -1) {
    return "";
  }
  return name.slice(idx).toLowerCase();
}

export function validateVerificationFile(input: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  documentType?: string;
}): VerificationFileValidationResult {
  const ext = extensionOf(input.fileName);
  const imageOnly =
    input.documentType &&
    VERIFICATION_IMAGE_ONLY_DOCUMENT_TYPES.includes(
      input.documentType as (typeof VERIFICATION_IMAGE_ONLY_DOCUMENT_TYPES)[number]
    );

  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return { error: "Định dạng file không được hỗ trợ.", ok: false };
  }

  if (imageOnly) {
    if (ext === ".pdf") {
      return { error: "Giấy tờ định danh chỉ chấp nhận ảnh (JPG, PNG, WEBP).", ok: false };
    }
    if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
      return { error: "Giấy tờ định danh chỉ chấp nhận ảnh (JPG, PNG, WEBP).", ok: false };
    }
    if (
      !VERIFICATION_IMAGE_MIME_TYPES.includes(
        input.mimeType as (typeof VERIFICATION_IMAGE_MIME_TYPES)[number]
      )
    ) {
      return { error: "Giấy tờ định danh chỉ chấp nhận ảnh (JPG, PNG, WEBP).", ok: false };
    }
  } else if (
    !VERIFICATION_ALLOWED_EXTENSIONS.includes(ext as (typeof VERIFICATION_ALLOWED_EXTENSIONS)[number])
  ) {
    return { error: "Định dạng file không được hỗ trợ.", ok: false };
  } else if (
    !VERIFICATION_ALLOWED_MIME_TYPES.includes(
      input.mimeType as (typeof VERIFICATION_ALLOWED_MIME_TYPES)[number]
    )
  ) {
    return { error: "Định dạng file không được hỗ trợ.", ok: false };
  }

  if (input.sizeBytes > VERIFICATION_FILE_LIMITS.maxBytesPerFile) {
    return { error: "File vượt quá dung lượng cho phép.", ok: false };
  }

  if (input.sizeBytes <= 0) {
    return { error: "File không hợp lệ.", ok: false };
  }

  return { ok: true };
}

export function validateVerificationBatch(totalBytes: number, fileCount: number): VerificationFileValidationResult {
  if (fileCount > VERIFICATION_FILE_LIMITS.maxFilesPerRequest) {
    return { error: "Vượt quá số file cho phép mỗi yêu cầu.", ok: false };
  }

  if (totalBytes > VERIFICATION_FILE_LIMITS.maxTotalBytesPerRequest) {
    return { error: "Tổng dung lượng file vượt quá giới hạn.", ok: false };
  }

  return { ok: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
