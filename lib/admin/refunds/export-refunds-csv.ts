"use server";

import { checkStaffAnyPermission } from "@/lib/auth/staff-guards";
import { queryRefundsForAdmin } from "@/lib/data/refunds";
import { refundSourceLabel, refundStatusLabel, refundTypeLabel, formatRefundId } from "@/lib/admin/refunds/refund-labels";
import type { RefundDashboardFilters } from "@/types/admin-refund";

function escapeCsv(value: unknown) {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function exportRefundsCsv(filters: RefundDashboardFilters): Promise<{
  csv: string;
  error: string | null;
}> {
  const auth = await checkStaffAnyPermission(["finance.refund.export", "finance.refund.create"]);
  if (!auth.ok) return { csv: "", error: auth.error };

  const result = await queryRefundsForAdmin({
    limit: 5000,
    offset: 0,
    status: filters.status !== "all" ? filters.status : undefined,
    refundType: filters.refundType !== "all" ? filters.refundType : undefined,
    source: filters.source !== "all" ? filters.source : undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    highRiskOnly: filters.highRiskOnly
  });

  if (result.error) return { csv: "", error: result.error };

  const headers = [
    "Refund ID",
    "Transaction ID",
    "Buyer User ID",
    "Creator User ID",
    "Type",
    "Source",
    "Coin Amount",
    "VND",
    "Status",
    "Reason",
    "Created At"
  ];

  const rows = result.data.map((r) =>
    [
      formatRefundId(r.id),
      r.originalTransactionId,
      r.userId,
      r.creatorUserId,
      refundTypeLabel(r.refundType),
      refundSourceLabel(r.source),
      r.coinAmount,
      r.amountVnd,
      refundStatusLabel(r.status),
      r.reasonPublic ?? r.reason,
      r.createdAt
    ]
      .map(escapeCsv)
      .join(",")
  );

  const bom = "\uFEFF";
  return { csv: bom + [headers.join(","), ...rows].join("\n"), error: null };
}
