"use server";

import { createClient } from "@/lib/supabase/server";
import { checkStaffPermission } from "@/lib/auth/staff-guards";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { computeWithdrawalFeeVnd } from "@/lib/admin/withdrawals/compute-withdrawal-fee";
import {
  formatPayoutMasked,
  loadWithdrawalEnrichedContext
} from "@/lib/admin/withdrawals/load-withdrawal-context";
import { computeWithdrawalRiskLevel } from "@/lib/admin/withdrawals/compute-withdrawal-risk";
import {
  auditActionLabel,
  formatWithdrawalCode,
  withdrawalMethodLabel,
  withdrawalStatusLabel
} from "@/lib/admin/withdrawals/withdrawal-labels";
import { getPayoutRequestById, listPayoutRequestsForCreator } from "@/lib/supabase/payouts";
import { getCreatorWithdrawalSecurity } from "@/lib/supabase/creator-finance";
import { calculateCreatorBalance } from "@/lib/finance/calculate-creator-balance";
import { getCreatorFinanceConfig } from "@/lib/finance/get-creator-finance-config";
import type {
  AdminWithdrawalDetail,
  WithdrawalAdminAction,
  WithdrawalAuditEntry,
  WithdrawalSafetyCheck
} from "@/types/admin-withdrawal";
import type { PayoutRequestStatus } from "@/types/payout";

function allowedActionsForStatus(
  status: PayoutRequestStatus,
  canApprove: boolean,
  canReject: boolean
): WithdrawalAdminAction[] {
  if (status === "completed") return [];
  const actions: WithdrawalAdminAction[] = [];

  if (status === "requested" || status === "under_review") {
    if (canApprove) actions.push("approve", "risk_review");
    if (canReject) actions.push("reject");
  }
  if (status === "approved") {
    if (canApprove) actions.push("processing");
    if (canReject) actions.push("reject");
  }
  if (status === "processing") {
    if (canApprove) actions.push("paid", "return_to_approved");
    if (canReject) actions.push("failed");
  }
  if (status === "failed") {
    if (canApprove) actions.push("return_to_approved");
  }
  if (status === "rejected" || status === "cancelled") {
    if (canApprove) actions.push("reopen");
  }
  return actions;
}

export async function loadAdminWithdrawalDetailAction(
  requestId: string
): Promise<{ detail: AdminWithdrawalDetail | null; error: string | null }> {
  const auth = await checkStaffPermission("finance.payout.view");
  if (!auth.ok) {
    return { detail: null, error: auth.error };
  }

  const requestResult = await getPayoutRequestById(requestId);
  if (!requestResult.data) {
    return { detail: null, error: requestResult.error ?? "Không tìm thấy yêu cầu." };
  }

  const req = requestResult.data;
  const supabase = await createClient();
  const ctx = await loadWithdrawalEnrichedContext(500);
  const feeVnd = await computeWithdrawalFeeVnd(req.amount_vnd);
  const financeConfig = await getCreatorFinanceConfig();

  const creatorRes = await supabase
    .from("creator_profiles")
    .select("id")
    .eq("user_id", req.creator_user_id)
    .maybeSingle();

  const [
    profileRes,
    monetizationRes,
    balanceRes,
    securityRes,
    historyRes,
    auditRes,
    qualityRes,
    reportsRes
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url, is_verified, verification_type, status")
      .eq("id", req.creator_user_id)
      .maybeSingle(),
    supabase
      .from("creator_monetization_profiles")
      .select("status, monetization_enabled, payout_enabled")
      .eq("user_id", req.creator_user_id)
      .maybeSingle(),
    calculateCreatorBalance(req.creator_user_id),
    getCreatorWithdrawalSecurity(req.creator_user_id),
    listPayoutRequestsForCreator(req.creator_user_id, 50),
    supabase
      .from("admin_audit_logs")
      .select("id, action, actor_id, metadata, created_at")
      .eq("target_type", "payout_request")
      .eq("target_id", req.id)
      .order("created_at", { ascending: false })
      .limit(30),
    creatorRes.data?.id
      ? supabase
          .from("stories")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", creatorRes.data.id)
          .in("quality_status", ["at_risk", "permanently_hidden", "needs_fix"])
      : Promise.resolve({ count: 0 }),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("reported_user_id", req.creator_user_id)
      .in("status", ["pending", "reviewing"])
  ]);

  const profile = profileRes.data;
  const emailMap = ctx.emailByUserId;
  const email = emailMap.get(req.creator_user_id) ?? null;

  const successfulWithdrawals = (historyRes.data ?? []).filter(
    (h) => h.status === "completed"
  ).length;

  const wallet = balanceRes.data;
  const lockedVnd = wallet?.lockedBalanceVnd ?? 0;
  const availableVnd = wallet?.availableBalanceVnd ?? 0;
  const ledgerMismatch =
    wallet != null &&
    Math.abs(wallet.ledgerHoldsVnd - lockedVnd) > 1 &&
    ["requested", "under_review", "approved", "processing"].includes(req.status);

  const otherActive = ctx.requests.filter(
    (r) => r.creator_user_id === req.creator_user_id && r.id !== req.id
  );

  const riskLevel = await computeWithdrawalRiskLevel({
    creatorUserId: req.creator_user_id,
    request: req,
    profileStatus: (profile?.status as string) ?? null,
    monetizationStatus: (monetizationRes.data?.status as string) ?? null,
    monetizationEnabled: Boolean(monetizationRes.data?.monetization_enabled),
    ledgerMismatch,
    otherActiveRequests: otherActive,
    hasContentQualityWarning: (qualityRes.count ?? 0) > 0,
    hasOpenReport: (reportsRes.count ?? 0) > 0
  });

  const actorIds = [
    ...new Set(
      (auditRes.data ?? [])
        .map((a) => a.actor_id as string | null)
        .filter(Boolean) as string[]
    )
  ];
  const { data: actors } = actorIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name, username")
        .in("id", actorIds)
    : { data: [] };
  const actorLabels = new Map(
    (actors ?? []).map((a) => [
      a.id as string,
      (a.display_name as string) ?? (a.username as string) ?? (a.id as string)
    ])
  );

  const auditLog: WithdrawalAuditEntry[] = (auditRes.data ?? []).map((row) => {
    const meta = (row.metadata as Record<string, unknown>) ?? {};
    const before = (meta.before as Record<string, unknown>) ?? {};
    const after = (meta.after as Record<string, unknown>) ?? {};
    return {
      id: row.id as string,
      action: row.action as string,
      actionLabel: auditActionLabel(row.action as string),
      actorLabel: row.actor_id ? (actorLabels.get(row.actor_id as string) ?? null) : null,
      oldStatus: (before.status as string) ?? null,
      newStatus: (after.status as string) ?? null,
      note: (meta.note as string) ?? null,
      referenceCode:
        (after.payment_reference as string) ?? (meta.reference_code as string) ?? null,
      createdAt: row.created_at as string
    };
  });

  const duplicateActive = otherActive.some((r) =>
    ["requested", "under_review", "approved", "processing"].includes(r.status)
  );

  const safetyChecks: WithdrawalSafetyCheck[] = [
    {
      id: "email",
      label: "Đã xác minh email",
      passed: Boolean(email),
      detail: email ? "Có email tài khoản" : "Chưa có email"
    },
    {
      id: "pin_set",
      label: "Đã đặt PIN rút tiền",
      passed: financeConfig.withdrawalPinRequired
        ? Boolean(securityRes.data?.pin_hash)
        : true,
      detail: financeConfig.withdrawalPinRequired ? undefined : "Không bắt buộc PIN"
    },
    {
      id: "pin_used",
      label: "PIN được xác nhận khi tạo request",
      passed: true,
      detail: "Đã xác thực khi gửi yêu cầu (studio)"
    },
    {
      id: "no_duplicate",
      label: "Không có payout đang xử lý trùng",
      passed: !duplicateActive,
      detail: duplicateActive ? "Có yêu cầu khác đang active" : null
    },
    {
      id: "limit",
      label: "Không vượt hạn mức rút",
      passed: req.amount_vnd >= financeConfig.minWithdrawAmountVnd,
      detail: `Tối thiểu ${financeConfig.minWithdrawAmountVnd.toLocaleString("vi-VN")} ₫`
    },
    {
      id: "fraud",
      label: "Không có cảnh báo gian lận nghiêm trọng",
      passed: riskLevel !== "high",
      detail: riskLevel === "high" ? "Rủi ro cao" : null
    },
    {
      id: "revenue_lock",
      label: "Không có doanh thu đang bị khóa do khiếu nại/refund",
      passed: (reportsRes.count ?? 0) === 0,
      detail: null
    },
    {
      id: "account",
      label: "Tài khoản không bị ban/hạn chế kiếm tiền",
      passed:
        profile?.status !== "banned" &&
        profile?.status !== "suspended" &&
        monetizationRes.data?.status !== "suspended",
      detail: profile?.status === "banned" ? "Tài khoản bị ban" : null
    },
    {
      id: "ledger",
      label: "Ledger khớp số dư",
      passed: !ledgerMismatch,
      detail: ledgerMismatch ? "Locked wallet ≠ ledger holds" : null
    }
  ];

  const authCtx = await getCurrentAuthContext();
  const canApprove = Boolean(
    authCtx?.permissions.includes("finance.payout.approve")
  );
  const canReject = Boolean(authCtx?.permissions.includes("finance.payout.reject"));

  const snapshot = req.payout_account_snapshot ?? {};

  const detail: AdminWithdrawalDetail = {
    id: req.id,
    withdrawalCode: formatWithdrawalCode(req.id),
    status: req.status,
    statusLabel: withdrawalStatusLabel(req.status),
    requestedAt: req.requested_at,
    updatedAt: req.updated_at,
    reviewedAt: req.reviewed_at,
    completedAt: req.completed_at,
    paidAt: req.paid_at,
    amountVnd: req.amount_vnd,
    feeVnd,
    netAmountVnd: Math.max(0, req.amount_vnd - feeVnd),
    currency: "VND",
    creatorNote: req.creator_note,
    adminNote: req.admin_note,
    rejectReason: req.reject_reason,
    paymentReference: req.payment_reference,
    method: req.method,
    methodLabel: withdrawalMethodLabel(req.method),
    transactionId: req.transaction_id,
    riskLevel,
    creator: {
      userId: req.creator_user_id,
      displayName:
        (profile?.display_name as string) ??
        (profile?.username as string) ??
        req.creator_user_id.slice(0, 8),
      username: (profile?.username as string) ?? null,
      email,
      avatarUrl: (profile?.avatar_url as string) ?? null,
      studioName:
        (profile?.display_name as string | null)?.trim() ||
        (profile?.username as string | null)?.trim() ||
        null,
      isVerified: Boolean(profile?.is_verified),
      hasBlueTick: Boolean(profile?.is_verified && profile?.verification_type),
      monetizationStatus: (monetizationRes.data?.status as string) ?? null,
      monetizationEnabled: Boolean(monetizationRes.data?.monetization_enabled),
      payoutEnabled: Boolean(monetizationRes.data?.payout_enabled),
      successfulWithdrawalCount: successfulWithdrawals,
      totalWithdrawnVnd: wallet?.totalWithdrawnVnd ?? 0,
      hasContentQualityWarning: (qualityRes.count ?? 0) > 0,
      hasOpenRiskOrReport:
        riskLevel === "high" || (reportsRes.count ?? 0) > 0
    },
    wallet: {
      availableBeforeVnd:
        ["requested", "under_review", "approved", "processing"].includes(req.status)
          ? availableVnd + req.amount_vnd
          : null,
      lockedVnd,
      availableVnd,
      remainingAfterVnd: ["requested", "under_review", "approved", "processing"].includes(
        req.status
      )
        ? availableVnd
        : null,
      ledgerMismatch,
      ledgerHref: `/admin/creators?search=${encodeURIComponent(req.creator_user_id)}`
    },
    payout: {
      accountHolderName: (snapshot.account_holder_name as string) ?? null,
      bankName: (snapshot.bank_name as string) ?? null,
      maskedAccount: formatPayoutMasked(req.payout_account_snapshot),
      methodNote: null
    },
    safetyChecks,
    auditLog,
    allowedActions: allowedActionsForStatus(req.status, canApprove, canReject),
    canApprove,
    canReject
  };

  return { detail, error: null };
}
