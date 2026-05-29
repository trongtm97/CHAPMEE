import type { TransactionRiskReason } from "@/types/admin-transaction";
import type { TransactionRow } from "@/types/transaction";

export const LARGE_COIN_THRESHOLD = 5000;
export const LARGE_VND_THRESHOLD = 1_000_000;

export type TransactionRiskContext = {
  hasRiskEvent?: boolean;
  hasChargeback?: boolean;
  webhookFailed?: boolean;
  userFailureCount?: number;
};

export function getTransactionRiskReasons(
  tx: TransactionRow,
  context: TransactionRiskContext = {}
): TransactionRiskReason[] {
  const reasons = new Set<TransactionRiskReason>();
  const meta = tx.metadata ?? {};

  if (context.hasRiskEvent || meta.manual_review === true) {
    reasons.add("manual_review");
  }
  if (tx.type === "admin_coin_adjustment") {
    reasons.add("admin_adjustment");
  }
  if (tx.status === "failed") {
    reasons.add("repeated_failure");
  }
  if (tx.status === "refunded" || context.hasChargeback) {
    reasons.add("refund_chargeback");
  }
  if (meta.webhook_error === true || meta.payment_error === true || context.webhookFailed) {
    reasons.add("webhook_error");
  }

  const coin = Math.abs(tx.coin_amount ?? 0);
  const vnd = Math.abs(tx.money_amount_vnd ?? tx.gross_amount_vnd ?? 0);
  if (coin >= LARGE_COIN_THRESHOLD || vnd >= LARGE_VND_THRESHOLD) {
    reasons.add("large_amount");
  }

  if ((context.userFailureCount ?? 0) >= 3) {
    reasons.add("repeated_failure");
  }

  return [...reasons];
}

export function transactionNeedsReview(reasons: TransactionRiskReason[]) {
  return reasons.length > 0;
}
