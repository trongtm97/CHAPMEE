import type { StudioDbContentStatus } from "@/types/studio";

const PUBLISH_ALIASES = new Set(["published", "approved", "đăng", "dang", "da dang"]);
const DRAFT_ALIASES = new Set(["draft", "paused", "nháp", "nhap", "nha p"]);
const PENDING_ALIASES = new Set(["pending", "under_review", "đang duyệt", "dang duyet"]);

/** Creator Studio import — không đẩy vào hàng chờ duyệt khi CSV ghi published. */
export function normalizeCreatorImportContentStatus(
  value: string | null | undefined,
  currentStatus?: StudioDbContentStatus | string | null
): StudioDbContentStatus {
  const normalized = String(value ?? "").trim().toLowerCase();
  const current = String(currentStatus ?? "").trim().toLowerCase() as StudioDbContentStatus;

  if (!normalized) {
    return (current as StudioDbContentStatus) || "draft";
  }

  if (DRAFT_ALIASES.has(normalized)) {
    return "draft";
  }

  if (normalized === "hidden" || normalized === "archived" || normalized === "ẩn") {
    return "archived";
  }

  if (normalized === "rejected") {
    return current === "rejected" ? "rejected" : "draft";
  }

  if (PUBLISH_ALIASES.has(normalized)) {
    return "published";
  }

  if (PENDING_ALIASES.has(normalized)) {
    return "pending";
  }

  if (normalized === "scheduled") {
    return "approved";
  }

  return (current as StudioDbContentStatus) || "draft";
}

/** Chương mới import: mặc định nháp; chỉ đăng khi CSV ghi rõ published. */
export function resolveChapterImportStatus(
  rowStatus: string | null | undefined,
  isUpdate: boolean,
  currentStatus?: StudioDbContentStatus | string | null
): StudioDbContentStatus {
  if (!isUpdate) {
    const raw = String(rowStatus ?? "").trim().toLowerCase();
    if (PUBLISH_ALIASES.has(raw)) {
      return "published";
    }
    return "draft";
  }

  return normalizeCreatorImportContentStatus(rowStatus, currentStatus);
}

if (process.env.NODE_ENV !== "production") {
  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(`normalize-import-status: ${msg}`);
  };
  assert(resolveChapterImportStatus("", false) === "draft", "new default draft");
  assert(resolveChapterImportStatus("published", false) === "published", "new explicit publish");
  assert(
    normalizeCreatorImportContentStatus("published", "draft") === "published",
    "update published not pending"
  );
}
