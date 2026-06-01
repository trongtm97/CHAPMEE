/** Operational warning threshold (not a revenue-share rate). */
export const AD_MIN_PAYOUT_WARN_THRESHOLD_VND = 100_000;

export const AD_RESERVE_PERCENT_RISK_THRESHOLD = 5;

export const AD_CREATOR_POOL_CONFIRM_THRESHOLD = 50;

export type AdMonetizationHubValidation = {
  ok: boolean;
  formError?: string;
  warnings: string[];
  needsPoolConfirm: boolean;
};

export function validateAdMonetizationHubInput(input: {
  creator_pool_percent?: number;
  reserve_percent?: number;
  reserve_hold_days?: number;
  min_payout_vnd?: number;
}): AdMonetizationHubValidation {
  const warnings: string[] = [];
  let needsPoolConfirm = false;

  if (input.creator_pool_percent !== undefined) {
    const pool = input.creator_pool_percent;
    if (!Number.isFinite(pool) || pool < 0 || pool > 100) {
      return { ok: false, formError: "Tỷ lệ pool tác giả phải từ 0 đến 100.", warnings, needsPoolConfirm };
    }
    if (pool > AD_CREATOR_POOL_CONFIRM_THRESHOLD) {
      needsPoolConfirm = true;
      warnings.push(
        `Pool tác giả ${pool}% cao hơn ${AD_CREATOR_POOL_CONFIRM_THRESHOLD}% — cần xác nhận trước khi lưu.`
      );
    }
  }

  if (input.reserve_percent !== undefined) {
    const reserve = input.reserve_percent;
    if (!Number.isFinite(reserve) || reserve < 0 || reserve > 100) {
      return { ok: false, formError: "Tỷ lệ reserve phải từ 0 đến 100.", warnings, needsPoolConfirm };
    }
    if (reserve < AD_RESERVE_PERCENT_RISK_THRESHOLD) {
      warnings.push(
        `Reserve ${reserve}% thấp hơn ${AD_RESERVE_PERCENT_RISK_THRESHOLD}% — rủi ro invalid traffic chưa được bảo vệ đủ.`
      );
    }
  }

  if (input.reserve_hold_days !== undefined) {
    const days = input.reserve_hold_days;
    if (!Number.isInteger(days) || days < 0 || days > 365) {
      return { ok: false, formError: "Số ngày giữ reserve phải từ 0 đến 365.", warnings, needsPoolConfirm };
    }
  }

  if (input.min_payout_vnd !== undefined) {
    const min = input.min_payout_vnd;
    if (!Number.isFinite(min) || min < 0) {
      return { ok: false, formError: "Mức rút tối thiểu không hợp lệ.", warnings, needsPoolConfirm };
    }
    if (min < AD_MIN_PAYOUT_WARN_THRESHOLD_VND) {
      warnings.push(
        `Mức rút tối thiểu thấp — có thể tăng chi phí vận hành đối soát/chi trả (ngưỡng cảnh báo ${AD_MIN_PAYOUT_WARN_THRESHOLD_VND.toLocaleString("vi-VN")} ₫).`
      );
    }
  }

  return { ok: true, warnings, needsPoolConfirm };
}

export function buildEstimatePolicyMismatchWarning(input: {
  estimateVisible: boolean;
  policyEnabled: boolean;
}): string | null {
  if (input.estimateVisible && !input.policyEnabled) {
    return "Ước tính đang hiển thị cho tác giả nhưng chính sách chia doanh thu quảng cáo đang tắt — tác giả có thể thấy số liệu không khớp trạng thái thực tế.";
  }
  return null;
}
