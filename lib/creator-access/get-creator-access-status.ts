import { getCreatorAccessOverrideByUserId } from "@/lib/supabase/creator-access-overrides";
import type {
  CreatorAccessOverrideRow,
  CreatorAccessStatus
} from "@/types/creator-access";

export function buildCreatorAccessStatusFromOverride(
  override: CreatorAccessOverrideRow | null,
  options?: { minWithdrawAmountVnd?: number; availableBalanceVnd?: number }
): CreatorAccessStatus {
  const monetizationDisabled = Boolean(override?.monetization_disabled);
  const withdrawalDisabled = Boolean(override?.withdrawal_disabled);

  const monetizationEnabled = !monetizationDisabled;
  const withdrawalEnabled = !withdrawalDisabled;
  const source = monetizationDisabled || withdrawalDisabled ? "admin_override" : "default_enabled";

  let withdrawalBlockReason: string | null = null;
  if (withdrawalDisabled) {
    withdrawalBlockReason =
      override?.withdrawal_disabled_reason?.trim() ||
      "Tài khoản của bạn đang bị tạm tắt quyền rút tiền bởi ChapMee.";
  } else if (
    options?.minWithdrawAmountVnd != null &&
    options?.availableBalanceVnd != null &&
    options.availableBalanceVnd < options.minWithdrawAmountVnd
  ) {
    withdrawalBlockReason = `Số dư khả dụng chưa đạt mức rút tối thiểu (${options.minWithdrawAmountVnd.toLocaleString("vi-VN")} VND).`;
  }

  const canRequestWithdrawal = withdrawalEnabled && !withdrawalBlockReason;

  return {
    monetizationEnabled,
    withdrawalEnabled,
    monetizationDisabledReason: monetizationDisabled
      ? override?.monetization_disabled_reason?.trim() ||
        "Kiếm tiền đang bị tắt bởi ChapMee."
      : null,
    withdrawalDisabledReason: withdrawalDisabled
      ? override?.withdrawal_disabled_reason?.trim() ||
        "Tài khoản của bạn đang bị tạm tắt quyền rút tiền bởi ChapMee."
      : null,
    source,
    canRequestWithdrawal,
    withdrawalBlockReason,
    override
  };
}

export async function getCreatorAccessStatus(
  userId: string,
  options?: { minWithdrawAmountVnd?: number; availableBalanceVnd?: number }
): Promise<CreatorAccessStatus> {
  const overrideResult = await getCreatorAccessOverrideByUserId(userId);
  return buildCreatorAccessStatusFromOverride(overrideResult.data, options);
}

export async function isCreatorMonetizationAllowed(userId: string): Promise<boolean> {
  const status = await getCreatorAccessStatus(userId);
  return status.monetizationEnabled;
}

export async function isCreatorWithdrawalAllowed(userId: string): Promise<boolean> {
  const status = await getCreatorAccessStatus(userId);
  return status.withdrawalEnabled;
}
