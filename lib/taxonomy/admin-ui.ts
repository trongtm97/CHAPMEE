/** Admin taxonomy center toast / banner callback. */
export type TaxonomyAdminNotify = (
  message: string | null,
  variant?: "success" | "error"
) => void;

export const TAXONOMY_REQUEST_STATUS_LABELS = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  merged: "Đã gộp"
} as const;
