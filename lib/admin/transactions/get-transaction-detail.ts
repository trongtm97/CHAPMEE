"use server";

import { createClient } from "@/lib/supabase/server";
import {
  enrichAdminTransactions,
  fetchTransactionRiskContext
} from "@/lib/admin/transactions/enrich-transactions";
import { getTransactionById } from "@/lib/supabase/transactions";
import { transactionTypeLabel } from "@/lib/admin/transactions/transaction-labels";
import type {
  AdminTransactionDetail,
  TransactionAuditEntry
} from "@/types/admin-transaction";

function readMetaNumber(meta: Record<string, unknown>, key: string) {
  const value = meta[key];
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildAuditLog(
  tx: {
    created_at: string;
    updated_at: string;
    type: string;
    status: string;
    direction: string;
    coin_amount: number | null;
    money_amount_vnd: number | null;
    creator_net_vnd: number | null;
    metadata: Record<string, unknown> | null;
  },
  refunds: Array<{ created_at: string; reason: string | null; processed_by: string | null }>,
  chargebacks: Array<{ created_at: string; status: string }>
): TransactionAuditEntry[] {
  const entries: TransactionAuditEntry[] = [
    {
      id: "created",
      label: "Tạo giao dịch",
      at: tx.created_at,
      detail: transactionTypeLabel(tx.type)
    }
  ];

  const meta = tx.metadata ?? {};
  if (meta.payment_callback_at || meta.webhook_received_at) {
    entries.push({
      id: "payment_callback",
      label: "Nhận callback thanh toán",
      at: String(meta.payment_callback_at ?? meta.webhook_received_at),
      detail: null
    });
  }

  if (tx.status === "completed" && (tx.coin_amount != null || tx.money_amount_vnd != null)) {
    entries.push({
      id: "wallet",
      label: tx.direction === "credit" ? "Cộng ví" : "Trừ ví",
      at: tx.updated_at,
      detail: null
    });
  }

  if (tx.creator_net_vnd != null && tx.creator_net_vnd > 0) {
    entries.push({
      id: "creator_revenue",
      label: "Ghi nhận doanh thu tác giả",
      at: tx.updated_at,
      detail: null
    });
  }

  for (const refund of refunds) {
    entries.push({
      id: `refund-${refund.created_at}`,
      label: "Tạo hoàn tiền",
      at: refund.created_at,
      detail: refund.reason
    });
  }

  for (const cb of chargebacks) {
    entries.push({
      id: `chargeback-${cb.created_at}`,
      label: "Chargeback",
      at: cb.created_at,
      detail: cb.status
    });
  }

  if (meta.admin_action_at) {
    entries.push({
      id: "admin_action",
      label: "Thao tác admin",
      at: String(meta.admin_action_at),
      detail: meta.admin_action ? String(meta.admin_action) : null
    });
  }

  return entries.sort((a, b) => {
    if (!a.at || !b.at) return 0;
    return new Date(a.at).getTime() - new Date(b.at).getTime();
  });
}

export async function getAdminTransactionDetail(transactionId: string): Promise<{
  data: AdminTransactionDetail | null;
  error: string | null;
}> {
  const result = await getTransactionById(transactionId);
  if (result.error || !result.data) {
    return { data: null, error: result.error ?? "Không tìm thấy giao dịch." };
  }

  const supabase = await createClient();
  const riskContext = await fetchTransactionRiskContext([transactionId]);
  const [enriched] = await enrichAdminTransactions([result.data], riskContext);
  if (!enriched) {
    return { data: null, error: "Không tìm thấy giao dịch." };
  }

  const meta = enriched.metadata ?? {};
  const [{ data: refunds }, { data: chargebacks }] = await Promise.all([
    supabase
      .from("refunds")
      .select("created_at, reason, processed_by, coin_amount, status")
      .eq("original_transaction_id", transactionId)
      .order("created_at", { ascending: false }),
    supabase
      .from("chargebacks")
      .select("created_at, status")
      .eq("original_transaction_id", transactionId)
      .order("created_at", { ascending: false })
  ]);

  const refundRows = refunds ?? [];
  const chargebackRows = chargebacks ?? [];
  const refundedCoin = refundRows.reduce(
    (sum, row) => sum + Number(row.coin_amount ?? 0),
    0
  );

  let processedByLabel: string | null = null;
  const processedBy = refundRows.find((row) => row.processed_by)?.processed_by;
  if (processedBy) {
    const { data: actor } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", processedBy)
      .maybeSingle();
    processedByLabel = actor?.display_name ?? actor?.username ?? processedBy.slice(0, 8);
  }

  const detail: AdminTransactionDetail = {
    ...enriched,
    performerLabel: enriched.userLabel,
    recipientLabel: enriched.creatorLabel,
    moneyFlow: {
      grossAmountVnd: enriched.gross_amount_vnd ?? enriched.money_amount_vnd,
      providerFeeVnd: enriched.provider_fee_vnd ?? readMetaNumber(meta, "provider_fee_vnd"),
      platformFeeVnd: enriched.platform_fee_vnd,
      paidCoinAmount: enriched.paid_coin_amount,
      bonusCoinAmount: enriched.bonus_coin_amount,
      creatorGrossVnd: enriched.creator_gross_vnd,
      creatorNetVnd: enriched.creator_net_vnd,
      platformRevenueVnd: enriched.platform_net_vnd ?? enriched.platform_fee_vnd,
      walletBalanceBefore: readMetaNumber(meta, "wallet_balance_before"),
      walletBalanceAfter: readMetaNumber(meta, "wallet_balance_after")
    },
    refundInfo: {
      canRefund: enriched.status === "completed" && enriched.type !== "refund",
      refundedCoin: refundedCoin > 0 ? refundedCoin : null,
      hasChargeback: chargebackRows.length > 0,
      processedBy: processedByLabel,
      reason: refundRows[0]?.reason ?? null
    },
    auditLog: buildAuditLog(enriched, refundRows, chargebackRows)
  };

  return { data: detail, error: null };
}

export async function loadAdminTransactionDetailAction(transactionId: string) {
  return getAdminTransactionDetail(transactionId);
}
