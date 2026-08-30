import { NextResponse } from "next/server";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { fetchTransactionRiskIds } from "@/lib/data/admin-finance";
import { getTransactionsForAdminPaginated } from "@/lib/data/transactions";

export async function GET(request: Request) {
  const context = await getCurrentAuthContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "Bạn cần đăng nhập." }, { status: 401 });
  }

  const canView =
    context.permissions.includes("finance.dashboard.view") &&
    context.permissions.includes("wallet.transaction.view.all");

  if (!canView) {
    return NextResponse.json(
      { ok: false, error: "Bạn không có quyền thực hiện thao tác này." },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "25");
  const typeFilter = url.searchParams.get("type") ?? undefined;
  const types =
    typeFilter === "chapter_purchase" || typeFilter === "early_access"
      ? ["chapter_unlock", "story_unlock"]
      : typeFilter === "coin_reward"
        ? ["bonus_coin_grant", "rewarded_ad_coin", "creator_bonus"]
        : typeFilter === "payout"
          ? ["payout_request", "payout_completed"]
          : typeFilter === "chargeback"
            ? ["chargeback"]
            : typeFilter && typeFilter !== "all"
              ? [typeFilter]
              : undefined;

  const result = await getTransactionsForAdminPaginated({
    page,
    pageSize,
    types,
    status: url.searchParams.get("status") ?? undefined,
    source: url.searchParams.get("source") ?? undefined,
    startDate: url.searchParams.get("startDate") ?? url.searchParams.get("start") ?? undefined,
    endDate: url.searchParams.get("endDate") ?? url.searchParams.get("end") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    sort: (url.searchParams.get("sort") as
      | "newest"
      | "oldest"
      | "amount_high"
      | "amount_low"
      | "coin_high"
      | "coin_low"
      | null) ?? "newest",
    riskOnly: url.searchParams.get("riskOnly") === "1"
  });

  if (result.error) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  const riskIdSet = await fetchTransactionRiskIds(result.data.map((row) => row.id));

  return NextResponse.json({
    ok: true,
    data: result.data,
    total: result.total,
    riskIds: [...riskIdSet]
  });
}
