import {
  ADMIN_COIN_HIGH_AMOUNT_WARNING,
  getAdminCoinLimits
} from "@/lib/admin/coin-limits";
import {
  requiresDangerConfirm,
  validateDangerConfirmToken
} from "@/lib/admin/coin-danger";
import { buildAdminCoinReasonText } from "@/lib/admin/coin-reasons";
import type { AdminCoinReasonCode } from "@/types/coins";

const KHAC_NOTE_MIN_LENGTH = 20;

export async function validateAdminCoinAmount(input: {
  amount: number;
  coinType: "paid" | "bonus";
  direction: "credit" | "debit";
  reasonCode: AdminCoinReasonCode;
  adminNote?: string | null;
  dangerConfirmToken?: string | null;
  isBulk?: boolean;
}) {
  const limits = await getAdminCoinLimits();

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false as const, error: "Số coin phải lớn hơn 0." };
  }

  if (!Number.isInteger(input.amount)) {
    return { ok: false as const, error: "Số coin phải là số nguyên." };
  }

  if (input.amount > limits.maxPerUserPerAction) {
    return {
      ok: false as const,
      error: `Vượt giới hạn ${limits.maxPerUserPerAction.toLocaleString("vi-VN")} coin mỗi lần. Vui lòng dùng tài khoản có quyền cao hơn hoặc chia nhỏ lệnh.`
    };
  }

  const note = input.adminNote?.trim() ?? "";

  if (input.coinType === "paid" && !note) {
    return {
      ok: false as const,
      error: "Coin nạp bắt buộc có ghi chú chi tiết."
    };
  }

  if (input.reasonCode === "khac" && note.length < KHAC_NOTE_MIN_LENGTH) {
    return {
      ok: false as const,
      error: `Lý do Khác cần ghi chú tối thiểu ${KHAC_NOTE_MIN_LENGTH} ký tự.`
    };
  }

  if (input.amount > ADMIN_COIN_HIGH_AMOUNT_WARNING && !note) {
    return {
      ok: false as const,
      error: `Số coin trên ${ADMIN_COIN_HIGH_AMOUNT_WARNING.toLocaleString("vi-VN")} cần ghi chú nội bộ.`
    };
  }

  if (
    requiresDangerConfirm({
      coinType: input.coinType,
      amount: input.amount,
      isBulk: input.isBulk
    }) &&
    !validateDangerConfirmToken(input.dangerConfirmToken)
  ) {
    return {
      ok: false as const,
      error: "Thao tác nhạy cảm: cần xác nhận bằng cách gõ CONFIRM."
    };
  }

  const reason = buildAdminCoinReasonText(input.reasonCode, note || undefined);
  if (reason.length < 5) {
    return { ok: false as const, error: "Lý do quá ngắn." };
  }

  return { ok: true as const, reason, limits };
}

export function walletSnapshotFromBalances(paid: number, bonus: number) {
  return {
    paid_coin_balance: paid,
    bonus_coin_balance: bonus,
    total_coin_balance: paid + bonus
  };
}
