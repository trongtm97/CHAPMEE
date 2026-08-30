import { NextResponse } from "next/server";
import { assertActionAccess, ActionAccessError } from "@/lib/auth/assert-action-access";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { toCsv } from "@/lib/finance/export-csv";
import { getCreatorStatementRows } from "@/lib/data/finance-export";

export async function GET(request: Request) {
  const ctx = await getCurrentAuthContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const creatorUserId = url.searchParams.get("creatorUserId") ?? ctx.userId;

  if (creatorUserId !== ctx.userId) {
    const canViewOthers =
      ctx.permissions.includes("finance.payout.view") ||
      ctx.permissions.includes("wallet.transaction.view.all");
    if (!canViewOthers) {
      return NextResponse.json(
        { ok: false, error: "Bạn không có quyền xem doanh thu creator khác." },
        { status: 403 }
      );
    }
  } else {
    try {
      await assertActionAccess("creator.revenue.view.own");
    } catch (error) {
      const message =
        error instanceof ActionAccessError
          ? error.message
          : "Bạn không có quyền thực hiện thao tác này.";
      return NextResponse.json({ ok: false, error: message }, { status: 403 });
    }
  }

  const data = await getCreatorStatementRows({
    creatorUserId,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined
  });
  if (data.error) {
    return NextResponse.json({ ok: false, error: data.error }, { status: 400 });
  }

  const gross = data.transactions.reduce(
    (sum, tx) => sum + Number(tx.creator_gross_vnd ?? 0),
    0
  );
  const platformFees = data.transactions.reduce(
    (sum, tx) => sum + Number(tx.platform_fee_vnd ?? 0),
    0
  );
  const net = data.transactions.reduce(
    (sum, tx) => sum + Number(tx.creator_net_vnd ?? 0),
    0
  );
  const payouts = data.payouts.reduce(
    (sum, payout) => sum + Number(payout.amount_vnd ?? 0),
    0
  );
  const headers = [
    "period_from",
    "period_to",
    "creator_user_id",
    "gross_earnings_vnd",
    "platform_fees_vnd",
    "net_earnings_vnd",
    "payouts_vnd",
    "pending_vnd",
    "available_vnd",
    "locked_vnd"
  ];
  const rows = [
    {
      period_from: url.searchParams.get("from") ?? "",
      period_to: url.searchParams.get("to") ?? "",
      creator_user_id: creatorUserId,
      gross_earnings_vnd: gross,
      platform_fees_vnd: platformFees,
      net_earnings_vnd: net,
      payouts_vnd: payouts,
      pending_vnd: data.wallet?.pending_revenue_vnd ?? 0,
      available_vnd: data.wallet?.available_revenue_vnd ?? 0,
      locked_vnd: data.wallet?.locked_revenue_vnd ?? 0
    }
  ];

  const csv = toCsv(headers, rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="creator-statement-${creatorUserId.slice(0, 8)}.csv"`
    }
  });
}
