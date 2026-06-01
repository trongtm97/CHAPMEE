import type { CoinPack } from "@/types/payment";
import type {
  TopupPackagePaymentSnapshot,
  ValidateTopupPackageForPaymentResult
} from "@/types/topup-package";
import { getCoinPackById } from "@/lib/supabase/coin-packs";

/** Build payment snapshot from a coin pack row (server-side only). */
export function buildTopupPackagePaymentSnapshot(
  pack: CoinPack
): TopupPackagePaymentSnapshot {
  return {
    package_id: pack.id,
    package_name: pack.name,
    amount_vnd: pack.amount_vnd,
    base_coin: pack.base_coin_amount,
    bonus_percent: pack.bonus_percent,
    bonus_coin: pack.bonus_coin_amount,
    total_coin: pack.total_coin_amount
  };
}

function validateSnapshotValues(
  snapshot: TopupPackagePaymentSnapshot
): ValidateTopupPackageForPaymentResult {
  if (snapshot.amount_vnd <= 0) {
    return { ok: false, error: "Gói nạp có số tiền không hợp lệ." };
  }
  if (snapshot.total_coin <= 0) {
    return { ok: false, error: "Gói nạp có tổng coin không hợp lệ." };
  }
  return { ok: true, snapshot };
}

/**
 * Validate package before creating top-up checkout.
 * Amount/coin values always come from DB — never trust client payload.
 */
export async function validateTopupPackageForPayment(
  packageId: string
): Promise<ValidateTopupPackageForPaymentResult> {
  const trimmed = packageId.trim();
  if (!trimmed) {
    return { ok: false, error: "Thiếu package_id." };
  }

  const result = await getCoinPackById(trimmed);
  if (!result.data) {
    return { ok: false, error: result.error ?? "Gói nạp không tồn tại." };
  }

  if (!result.data.is_active) {
    return { ok: false, error: "Gói nạp đang tắt. Vui lòng chọn gói khác." };
  }

  return validateSnapshotValues(buildTopupPackagePaymentSnapshot(result.data));
}

/** Reject client attempts to override monetary fields. */
export const FORBIDDEN_TOPUP_CLIENT_FIELDS = [
  "amount_vnd",
  "base_coin",
  "bonus_percent",
  "bonus_coin",
  "total_coin",
  "price_vnd",
  "base_coin_amount",
  "bonus_coin_amount",
  "total_coin_amount"
] as const;

export function rejectForbiddenTopupClientFields(
  payload: Record<string, unknown>
): { ok: true } | { ok: false; error: string } {
  for (const key of FORBIDDEN_TOPUP_CLIENT_FIELDS) {
    const value = payload[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return {
        ok: false,
        error: `Không được gửi trường ${key} từ client. Chỉ gửi package_id.`
      };
    }
  }
  return { ok: true };
}
