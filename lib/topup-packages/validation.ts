import {
  TOPUP_AMOUNT_STEP_VND,
  TOPUP_BONUS_HARD_MAX,
  TOPUP_BONUS_RECOMMENDED_MAX,
  TOPUP_MAX_RECOMMENDED_PACKAGES
} from "@/lib/topup-packages/constants";
import type { CoinTopupPackage } from "@/types/topup-package";

export type TopupPackageValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  requiresHighBonusConfirm: boolean;
  blockedByHardBonusCap: boolean;
};

type ValidateTopupPackageInput = {
  amountVnd: number;
  bonusPercent: number;
  isActive: boolean;
  isRecommended: boolean;
  excludeId?: string;
  existingPackages: CoinTopupPackage[];
  confirmHighBonus?: boolean;
  isElevatedAdmin?: boolean;
};

export function validateTopupPackageForm(
  input: ValidateTopupPackageInput
): TopupPackageValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Number.isInteger(input.amountVnd) || input.amountVnd <= 0) {
    errors.push("Số tiền nạp phải là số nguyên dương.");
  } else if (input.amountVnd % TOPUP_AMOUNT_STEP_VND !== 0) {
    warnings.push(`Nên chọn bội số ${TOPUP_AMOUNT_STEP_VND.toLocaleString("vi-VN")}đ.`);
  }

  if (input.bonusPercent < 0) {
    errors.push("Bonus % không được âm.");
  }

  let requiresHighBonusConfirm = false;
  let blockedByHardBonusCap = false;

  if (input.bonusPercent > TOPUP_BONUS_HARD_MAX) {
    if (input.isElevatedAdmin) {
      warnings.push(`Bonus ${input.bonusPercent}% vượt ngưỡng an toàn ${TOPUP_BONUS_HARD_MAX}%.`);
    } else {
      blockedByHardBonusCap = true;
      errors.push(
        `Bonus không được vượt ${TOPUP_BONUS_HARD_MAX}% trừ khi có quyền admin cao hơn.`
      );
    }
  } else if (input.bonusPercent > TOPUP_BONUS_RECOMMENDED_MAX) {
    requiresHighBonusConfirm = true;
    if (!input.confirmHighBonus) {
      warnings.push(
        `Bonus ${input.bonusPercent}% vượt mức khuyến nghị ${TOPUP_BONUS_RECOMMENDED_MAX}%.`
      );
    }
  }

  if (input.isActive) {
    const duplicate = input.existingPackages.find(
      (pkg) =>
        pkg.is_active &&
        pkg.amount_vnd === input.amountVnd &&
        pkg.id !== input.excludeId
    );
    if (duplicate) {
      errors.push(
        `Đã có gói đang bật với mốc ${input.amountVnd.toLocaleString("vi-VN")}đ.`
      );
    }
  }

  if (input.isRecommended) {
    const recommendedCount = input.existingPackages.filter(
      (pkg) => pkg.is_recommended && pkg.id !== input.excludeId
    ).length;
    if (recommendedCount >= TOPUP_MAX_RECOMMENDED_PACKAGES) {
      warnings.push(
        `Đã có ${recommendedCount} gói đề xuất. Nên giữ tối đa ${TOPUP_MAX_RECOMMENDED_PACKAGES} gói.`
      );
    }
  }

  return {
    ok: errors.length === 0 && !(requiresHighBonusConfirm && !input.confirmHighBonus),
    errors,
    warnings,
    requiresHighBonusConfirm,
    blockedByHardBonusCap
  };
}

export function validateTopupPackageId(
  packageId: string,
  packages: CoinTopupPackage[]
): { ok: boolean; package?: CoinTopupPackage; error?: string } {
  const pkg = packages.find((item) => item.id === packageId);
  if (!pkg) {
    return { ok: false, error: "Gói nạp không tồn tại." };
  }
  if (!pkg.is_active) {
    return { ok: false, error: "Gói nạp đang tắt." };
  }
  return { ok: true, package: pkg };
}
