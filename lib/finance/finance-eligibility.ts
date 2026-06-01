import type {
  BankAccountView,
  CreatorFinanceConfigView,
  FinanceIdentityStatus,
  FinancePinStatus,
  FinanceWithdrawalChecklistItem,
  StudioFinanceEligibility
} from "@/types/finance";

const VERIFICATION_HREF = "/studio/settings/verification";

type EligibilityInput = {
  config: CreatorFinanceConfigView;
  creatorAccessWithdrawalEnabled: boolean;
  creatorAccessWithdrawalDisabledReason: string | null;
  identity: FinanceIdentityStatus;
  bankAccounts: BankAccountView[];
  pinConfigured: boolean;
  pinLocked: boolean;
  availableBalanceVnd: number;
};

export function resolveStudioFinanceEligibility(input: EligibilityInput): StudioFinanceEligibility {
  const blockReasons: string[] = [];
  const checklist: FinanceWithdrawalChecklistItem[] = [];

  const withdrawalDisabledByAdmin = !input.creatorAccessWithdrawalEnabled;
  const identityVerified = input.identity.status === "verified";
  const withdrawableAccounts = input.bankAccounts.filter((a) => a.canUseForWithdrawal);
  const hasWithdrawableBankAccount = withdrawableAccounts.length > 0;
  const pinReady = !input.config.withdrawalPinRequired || input.pinConfigured;
  const minBalanceMet = input.availableBalanceVnd >= input.config.minWithdrawAmountVnd;

  checklist.push({
    id: "admin",
    label: "Khóa admin",
    met: !withdrawalDisabledByAdmin
  });
  checklist.push({
    id: "identity",
    label: "Xác thực tài khoản",
    met: identityVerified,
    ctaLabel: identityVerified ? undefined : input.identity.ctaLabel,
    ctaHref: VERIFICATION_HREF
  });
  checklist.push({
    id: "bank",
    label: "Tài khoản nhận tiền",
    met: hasWithdrawableBankAccount,
    ctaLabel: hasWithdrawableBankAccount ? undefined : "Thêm tài khoản",
    ctaAction: "add-bank"
  });
  checklist.push({
    id: "pin",
    label: "PIN rút tiền",
    met: pinReady,
    ctaLabel: pinReady ? undefined : "Thiết lập PIN",
    ctaAction: "setup-pin"
  });
  checklist.push({
    id: "balance",
    label: "Số dư tối thiểu",
    met: minBalanceMet
  });

  if (withdrawalDisabledByAdmin && input.creatorAccessWithdrawalDisabledReason) {
    blockReasons.push(input.creatorAccessWithdrawalDisabledReason);
  }
  if (!identityVerified) {
    blockReasons.push("Bạn cần xác thực danh tính trước khi rút tiền.");
  }
  if (input.bankAccounts.length === 0) {
    blockReasons.push("Vui lòng thêm tài khoản nhận tiền.");
  } else if (!hasWithdrawableBankAccount) {
    blockReasons.push("Chưa có tài khoản ngân hàng hợp lệ để rút tiền.");
  }
  if (input.config.withdrawalPinRequired && !input.pinConfigured) {
    blockReasons.push("Vui lòng thiết lập mã PIN rút tiền.");
  }

  let pinStatus: FinancePinStatus = "not_set";
  if (input.pinConfigured) {
    pinStatus = input.pinLocked ? "locked_temp" : "set";
  }
  if (input.pinLocked) {
    blockReasons.push("Mã PIN đang bị khóa tạm thời.");
  }

  if (!minBalanceMet) {
    blockReasons.push(
      `Số dư khả dụng chưa đạt mức rút tối thiểu (${input.config.minWithdrawAmountVnd.toLocaleString("vi-VN")} ₫).`
    );
  }

  const uniqueReasons = [...new Set(blockReasons)];

  return {
    withdrawalDisabledByAdmin,
    identityVerified,
    hasWithdrawableBankAccount,
    pinReady,
    minBalanceMet,
    pinStatus,
    checklist,
    blockReasons: uniqueReasons,
    canWithdraw: uniqueReasons.length === 0,
    primaryBlockReason: uniqueReasons[0] ?? null,
    payoutVerified: identityVerified,
    bankNameMatchesLegal: hasWithdrawableBankAccount,
    payoutLockActive: false,
    payoutLockUntil: null,
    payoutLockReason: null
  };
}
