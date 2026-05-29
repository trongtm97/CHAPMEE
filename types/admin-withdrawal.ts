import type { PayoutMethod, PayoutRequestStatus } from "@/types/payout";

export type WithdrawalStatusFilter =
  | "all"
  | "pending"
  | "approved"
  | "processing"
  | "paid"
  | "rejected"
  | "failed"
  | "cancelled";

export type WithdrawalMethodFilter = "all" | PayoutMethod;

export type WithdrawalRiskFilter = "all" | "normal" | "warning" | "high";

export type WithdrawalSortOption =
  | "newest"
  | "oldest"
  | "amount_desc"
  | "amount_asc";

export type WithdrawalDashboardFilters = {
  search: string;
  status: WithdrawalStatusFilter;
  method: WithdrawalMethodFilter;
  risk: WithdrawalRiskFilter;
  startDate: string;
  endDate: string;
  minAmount: string;
  maxAmount: string;
  sort: WithdrawalSortOption;
  page: number;
  pageSize: number;
  selectedId: string | null;
};

export type WithdrawalRiskLevel = "normal" | "warning" | "high";

export type WithdrawalKpiSummary = {
  pendingCount: number;
  approvedCount: number;
  processingCount: number;
  paidCount: number;
  rejectedCount: number;
  failedCount: number;
  pendingAmountVnd: number;
  paidAmountInPeriodVnd: number;
  creatorsWaitingCount: number;
  riskAlertCount: number;
};

export type AdminWithdrawalListRow = {
  id: string;
  withdrawalCode: string;
  creatorUserId: string;
  displayName: string;
  username: string | null;
  email: string | null;
  avatarUrl: string | null;
  studioName: string | null;
  isVerified: boolean;
  hasBlueTick: boolean;
  amountVnd: number;
  feeVnd: number;
  netAmountVnd: number;
  method: PayoutMethod;
  methodLabel: string;
  payoutMasked: string;
  status: PayoutRequestStatus;
  statusLabel: string;
  requestedAt: string;
  riskLevel: WithdrawalRiskLevel;
  lastProcessorLabel: string | null;
};

export type WithdrawalSafetyCheck = {
  id: string;
  label: string;
  passed: boolean;
  detail?: string | null;
};

export type WithdrawalAuditEntry = {
  id: string;
  action: string;
  actionLabel: string;
  actorLabel: string | null;
  oldStatus: string | null;
  newStatus: string | null;
  note: string | null;
  referenceCode: string | null;
  createdAt: string;
};

export type AdminWithdrawalDetail = {
  id: string;
  withdrawalCode: string;
  status: PayoutRequestStatus;
  statusLabel: string;
  requestedAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  completedAt: string | null;
  paidAt: string | null;
  amountVnd: number;
  feeVnd: number;
  netAmountVnd: number;
  currency: string;
  creatorNote: string | null;
  adminNote: string | null;
  rejectReason: string | null;
  paymentReference: string | null;
  method: PayoutMethod;
  methodLabel: string;
  transactionId: string | null;
  riskLevel: WithdrawalRiskLevel;
  creator: {
    userId: string;
    displayName: string;
    username: string | null;
    email: string | null;
    avatarUrl: string | null;
    studioName: string | null;
    isVerified: boolean;
    hasBlueTick: boolean;
    monetizationStatus: string | null;
    monetizationEnabled: boolean;
    payoutEnabled: boolean;
    successfulWithdrawalCount: number;
    totalWithdrawnVnd: number;
    hasContentQualityWarning: boolean;
    hasOpenRiskOrReport: boolean;
  };
  wallet: {
    availableBeforeVnd: number | null;
    lockedVnd: number;
    availableVnd: number;
    remainingAfterVnd: number | null;
    ledgerMismatch: boolean;
    ledgerHref: string;
  };
  payout: {
    accountHolderName: string | null;
    bankName: string | null;
    maskedAccount: string;
    methodNote: string | null;
  };
  safetyChecks: WithdrawalSafetyCheck[];
  auditLog: WithdrawalAuditEntry[];
  allowedActions: WithdrawalAdminAction[];
  canApprove: boolean;
  canReject: boolean;
};

export type WithdrawalAdminAction =
  | "approve"
  | "reject"
  | "risk_review"
  | "processing"
  | "paid"
  | "failed"
  | "return_to_approved"
  | "reopen";

export type ProcessWithdrawalActionInput = {
  requestId: string;
  action: WithdrawalAdminAction;
  adminNote?: string;
  rejectReason?: string;
  paymentReference?: string;
  paidAt?: string;
};
