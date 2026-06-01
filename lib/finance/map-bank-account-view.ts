import { formatLockRemaining, isLockActive, namesMatch } from "@/lib/finance/finance-security-utils";
import type { BankAccountView, FinanceIdentityStatus } from "@/types/finance";
import type { CreatorPayoutAccount } from "@/types/payout";

function readAccountSecurity(account: CreatorPayoutAccount & {
  withdrawal_locked_until?: string | null;
  email_verified_at?: string | null;
}) {
  const meta = account.metadata ?? {};
  return {
    withdrawalLockedUntil:
      account.withdrawal_locked_until ??
      (meta.withdrawal_locked_until as string | undefined) ??
      null,
    emailVerifiedAt:
      account.email_verified_at ?? (meta.email_verified_at as string | undefined) ?? null
  };
}

export function formatBankAccountDisplay(masked: string | null): string {
  if (!masked) return "—";
  const digits = masked.replace(/\D/g, "");
  if (digits.length >= 8) {
    return `${digits.slice(0, 4)} **** ${digits.slice(-4)}`;
  }
  if (digits.length >= 4) {
    return `**** **** ${digits.slice(-4)}`;
  }
  return masked;
}

export function mapBankAccountView(
  account: CreatorPayoutAccount,
  identity: FinanceIdentityStatus
): BankAccountView {
  const security = readAccountSecurity(account as CreatorPayoutAccount & {
    withdrawal_locked_until?: string | null;
    email_verified_at?: string | null;
  });
  const locked24h = isLockActive(security.withdrawalLockedUntil);
  const emailVerified =
    account.verification_status === "verified" || Boolean(security.emailVerifiedAt);

  let identityNameMatchStatus: BankAccountView["identityNameMatchStatus"] = "unknown";
  if (identity.status === "verified" && identity.verifiedName) {
    identityNameMatchStatus = namesMatch(identity.verifiedName, account.account_holder_name)
      ? "matched"
      : "mismatched";
  } else if (identity.status !== "verified") {
    identityNameMatchStatus = "unknown";
  }

  let accountStatus: BankAccountView["accountStatus"] = "pending_email";
  if (account.verification_status === "rejected") {
    accountStatus = "locked_by_admin";
  } else if (locked24h) {
    accountStatus = "locked_24h";
  } else if (emailVerified) {
    accountStatus = "verified";
  } else if (identity.status !== "verified") {
    accountStatus = "pending_identity";
  }

  const canUseForWithdrawal =
    identity.status === "verified" &&
    emailVerified &&
    !locked24h &&
    account.verification_status !== "rejected" &&
    identityNameMatchStatus !== "mismatched";

  return {
    id: account.id,
    bankName: account.bank_name ?? "—",
    accountNumberMasked: account.bank_account_number_masked,
    accountNumberDisplay: formatBankAccountDisplay(account.bank_account_number_masked),
    accountHolderName: account.account_holder_name ?? "—",
    branchNote: account.bank_branch ?? null,
    isDefault: account.is_default,
    emailVerifiedAt: security.emailVerifiedAt,
    accountStatus,
    identityNameMatchStatus,
    withdrawalLockedUntil: security.withdrawalLockedUntil,
    lockRemainingLabel: formatLockRemaining(security.withdrawalLockedUntil),
    canUseForWithdrawal,
    createdAt: account.created_at,
    updatedAt: account.updated_at
  };
}

export function mapBankAccountViews(
  accounts: CreatorPayoutAccount[],
  identity: FinanceIdentityStatus
): BankAccountView[] {
  return accounts
    .filter((a) => a.method === "bank_transfer")
    .map((a) => mapBankAccountView(a, identity));
}
