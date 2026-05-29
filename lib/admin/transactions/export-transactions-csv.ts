import {
  formatCoinAmount,
  formatVndAmount,
  transactionSourceLabel,
  transactionStatusLabel,
  transactionTypeLabel
} from "@/lib/admin/transactions/transaction-labels";
import type { AdminTransactionListRow } from "@/types/admin-transaction";

function escapeCsv(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportTransactionsToCsv(rows: AdminTransactionListRow[]) {
  const headers = [
    "created_at",
    "code",
    "type",
    "user",
    "creator",
    "related_content",
    "coin_amount",
    "vnd_amount",
    "status",
    "source"
  ];

  const lines = rows.map((row) => {
    const values = [
      row.created_at,
      row.transaction_code,
      transactionTypeLabel(row.type),
      row.userLabel ?? row.userEmail ?? row.user_id ?? "",
      row.creatorLabel ?? row.creator_user_id ?? "",
      row.relatedContent ?? "",
      formatCoinAmount(row.coin_amount, row.direction).replace("—", ""),
      formatVndAmount(row.money_amount_vnd).replace("—", ""),
      transactionStatusLabel(row.status),
      transactionSourceLabel(row.source, row.provider)
    ];
    return values.map((v) => escapeCsv(String(v))).join(",");
  });

  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `giao-dich-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
