import { NextResponse } from "next/server";
import { logFinanceAudit } from "@/lib/admin/finance-audit";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { toCsv } from "@/lib/finance/export-csv";
import { getFinanceExportRows } from "@/lib/supabase/finance-export";
import type { FinanceExportFilters, FinanceExportType } from "@/types/finance-export";

function mapTransactions(rows: Array<Record<string, unknown>>) {
  const headers = [
    "transaction_code",
    "created_at",
    "type",
    "source",
    "status",
    "user_id",
    "creator_user_id",
    "story_id",
    "chapter_id",
    "coin_amount",
    "paid_coin_amount",
    "bonus_coin_amount",
    "money_amount_vnd",
    "platform_fee_vnd",
    "creator_gross_vnd",
    "creator_net_vnd",
    "currency"
  ];
  return { headers, rows };
}

function mapPayouts(rows: Array<Record<string, unknown>>) {
  const headers = [
    "payout_request_id",
    "creator_user_id",
    "amount_vnd",
    "method",
    "status",
    "requested_at",
    "completed_at",
    "transaction_code"
  ];
  return {
    headers,
    rows: rows.map((row) => ({
      payout_request_id: row.id,
      creator_user_id: row.creator_user_id,
      amount_vnd: row.amount_vnd,
      method: row.method,
      status: row.status,
      requested_at: row.requested_at,
      completed_at: row.completed_at,
      transaction_code: Array.isArray(row.transactions)
        ? (row.transactions[0] as Record<string, unknown> | undefined)?.transaction_code ?? ""
        : (row.transactions as Record<string, unknown> | null)?.transaction_code ?? ""
    }))
  };
}

function mapRefunds(rows: Array<Record<string, unknown>>) {
  const headers = [
    "refund_id",
    "original_transaction_id",
    "user_id",
    "amount_vnd",
    "coin_amount",
    "status",
    "reason",
    "processed_at"
  ];
  return {
    headers,
    rows: rows.map((row) => ({
      refund_id: row.id,
      original_transaction_id: row.original_transaction_id,
      user_id: row.user_id,
      amount_vnd: row.amount_vnd,
      coin_amount: row.coin_amount,
      status: row.status,
      reason: row.reason,
      processed_at: row.processed_at
    }))
  };
}

function mapGeneric(rows: Array<Record<string, unknown>>) {
  const keys = Array.from(
    rows.reduce((set, row) => {
      for (const key of Object.keys(row)) set.add(key);
      return set;
    }, new Set<string>())
  );
  return { headers: keys, rows };
}

function csvMapper(type: FinanceExportType, rows: Array<Record<string, unknown>>) {
  if (
    type === "transactions" ||
    type === "coin_purchases" ||
    type === "creator_revenue" ||
    type === "supporter_transactions" ||
    type === "sponsored_campaign_revenue"
  ) {
    return mapTransactions(rows);
  }
  if (type === "payouts") return mapPayouts(rows);
  if (type === "refunds") return mapRefunds(rows);
  return mapGeneric(rows);
}

export async function GET(request: Request) {
  const context = await getCurrentAuthContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "Bạn cần đăng nhập." }, { status: 401 });
  }

  const canExport =
    context.permissions.includes("finance.report.export") ||
    (context.permissions.includes("finance.dashboard.view") &&
      context.permissions.includes("wallet.transaction.view.all"));

  if (!canExport) {
    return NextResponse.json(
      { ok: false, error: "Bạn không có quyền xuất báo cáo tài chính." },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const exportType = String(url.searchParams.get("exportType") ?? "transactions") as FinanceExportType;
  const filters: FinanceExportFilters = {
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    userId: url.searchParams.get("userId") ?? undefined,
    creatorUserId: url.searchParams.get("creatorUserId") ?? undefined,
    source: url.searchParams.get("source") ?? undefined,
    currency: url.searchParams.get("currency") ?? undefined
  };

  const result = await getFinanceExportRows(exportType, filters);
  if (result.error) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  const mapped = csvMapper(exportType, result.rows as Array<Record<string, unknown>>);
  const csv = toCsv(mapped.headers, mapped.rows);
  const stamp = new Date().toISOString().slice(0, 10);
  const fileName = `chapmee-${exportType}-${stamp}.csv`;

  await logFinanceAudit("finance_report_export", {
    exportType,
    filters,
    rowCount: result.rows.length
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`
    }
  });
}
