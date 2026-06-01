import type { CreatorAdRevenuePolicy } from "@/types/creator-ad-revenue-policy";

export type PolicyFormValidation = {
  ok: boolean;
  errors: Record<string, string>;
  warnings: string[];
};

export function validateCreatorAdRevenuePolicy(
  policy: Partial<CreatorAdRevenuePolicy>
): PolicyFormValidation {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];

  const pool = policy.creator_pool_percent;
  if (pool != null && (pool < 0 || pool > 100)) {
    errors.creator_pool_percent = "Tỷ lệ quỹ tác giả phải từ 0 đến 100.";
  }

  const reserve = policy.reserve_percent;
  if (reserve != null && (reserve < 0 || reserve > 100)) {
    errors.reserve_percent = "Tỷ lệ dự phòng phải từ 0 đến 100.";
  }

  if (policy.reserve_hold_days != null && policy.reserve_hold_days < 0) {
    errors.reserve_hold_days = "Số ngày giữ không được âm.";
  }

  if (policy.min_payout_vnd != null && policy.min_payout_vnd < 0) {
    errors.min_payout_vnd = "Ngưỡng rút không được âm.";
  }

  if (policy.max_invalid_traffic_rate != null) {
    const rate = policy.max_invalid_traffic_rate;
    if (rate < 0 || rate > 1) {
      errors.max_invalid_traffic_rate = "Tỷ lệ invalid traffic tối đa phải từ 0 đến 1 (hoặc 0–100% nếu nhập %).";
    }
  }

  if (policy.is_enabled && !policy.beta_mode) {
    warnings.push(
      "Chương trình đang bật chính thức (không beta) — hãy kiểm tra checklist triển khai trước khi lưu."
    );
  }

  if (policy.is_enabled && policy.internal_tracking_only) {
    warnings.push(
      "Chương trình bật nhưng vẫn ở chế độ chỉ theo dõi nội bộ — tác giả không nên coi là có thể rút tiền thật."
    );
  }

  warnings.push("Thay đổi chính sách tiền có thể ảnh hưởng thu nhập tác giả và sẽ được ghi audit.");

  return { ok: Object.keys(errors).length === 0, errors, warnings };
}
