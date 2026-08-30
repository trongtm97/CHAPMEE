/** Trạng thái trong hàng đợi kiểm duyệt (cần migration 092 cho changes_requested). */
export const CONTENT_REVIEW_QUEUE_STATUSES = ["pending", "changes_requested"] as const;
export const CONTENT_REVIEW_QUEUE_STATUSES_FALLBACK = ["pending"] as const;

export function isContentStatusEnumError(message: string | undefined | null) {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("changes_requested") ||
    (lower.includes("content_status") && lower.includes("enum"))
  );
}

type PostgrestQueryResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

/**
 * Truy vấn theo status hàng đợi; tự fallback về chỉ `pending` nếu DB chưa có enum changes_requested.
 */
export async function queryWithReviewQueueStatuses<T>(
  run: (statuses: readonly string[]) => Promise<PostgrestQueryResult<T>>
): Promise<PostgrestQueryResult<T>> {
  let result = await run(CONTENT_REVIEW_QUEUE_STATUSES);
  if (result.error && isContentStatusEnumError(result.error.message)) {
    result = await run(CONTENT_REVIEW_QUEUE_STATUSES_FALLBACK);
  }
  return result;
}
