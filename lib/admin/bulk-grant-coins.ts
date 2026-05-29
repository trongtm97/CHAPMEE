"use server";

import { revalidatePath } from "next/cache";
import { validateBulkCoinLines } from "@/lib/admin/coins";
import { buildAdminCoinReasonText } from "@/lib/admin/coin-reasons";
import { grantCoinToUserAction } from "@/lib/admin/grant-coin-to-user";
import { requireWalletAdjustAccess } from "@/lib/auth/finance-guards";
import type { AdminCoinReasonCode } from "@/types/coins";

export async function bulkGrantCoinsAction(
  raw: string,
  dangerConfirmToken?: string | null
) {
  const access = await requireWalletAdjustAccess();
  if (!access.ok) {
    return { ok: false, error: access.error ?? "Không có quyền cấp coin." };
  }

  const { lines, error, hasPaidCoin, totals } = await validateBulkCoinLines(raw);
  if (error && lines.length === 0) {
    return { ok: false, error };
  }

  const invalid = lines.filter((line) => !line.valid);
  if (invalid.length > 0) {
    return {
      ok: false,
      error: `Có ${invalid.length} dòng chưa hợp lệ. Sửa trước khi xác nhận.`
    };
  }

  const { requiresDangerConfirm, validateDangerConfirmToken } = await import(
    "@/lib/admin/coin-danger"
  );
  if (
    requiresDangerConfirm({
      coinType: hasPaidCoin ? "paid" : "bonus",
      amount: Math.max(totals.paid, totals.bonus),
      isBulk: true
    }) &&
    !validateDangerConfirmToken(dangerConfirmToken)
  ) {
    return { ok: false, error: "Cần xác nhận bulk bằng cách gõ CONFIRM." };
  }

  const validLines = lines.filter((line) => line.valid && line.userId && line.amount);
  let success = 0;
  const failures: string[] = [];

  for (const line of validLines) {
    const reasonCode = line.reasonCode as AdminCoinReasonCode;
    const result = await grantCoinToUserAction({
      userId: line.userId!,
      amount: line.amount!,
      coinType: line.coinType!,
      reason: buildAdminCoinReasonText(reasonCode),
      reasonCode,
      adminNote: `Bulk line ${line.line}`,
      referenceId: `bulk:${line.line}`,
      bulkAdminAdjustment: true,
      dangerConfirmToken
    });

    if (result.ok) {
      success += 1;
    } else {
      failures.push(`Dòng ${line.line}: ${result.error ?? "Lỗi"}`);
    }
  }

  revalidatePath("/admin/coins");

  if (failures.length > 0) {
    return {
      ok: false,
      error: `Hoàn tất ${success}/${validLines.length}. Lỗi: ${failures.slice(0, 3).join("; ")}`
    };
  }

  return {
    ok: true,
    error: null as string | null,
    message: `Đã cấp coin cho ${success} user.`
  };
}
