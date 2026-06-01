import { NextResponse } from "next/server";
import { listCreatorAdMonetizationProfiles } from "@/lib/creator-ad-revenue/profiles";
import { requireFinanceSettingsView } from "@/lib/auth/require-permission";
import { CREATOR_AD_STATUS_LABELS } from "@/types/creator-ad-revenue-policy";

function csvEscape(value: string | number | boolean | null | undefined) {
  const s = value == null ? "" : String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: Request) {
  const guard = await requireFinanceSettingsView("/admin/ad-revenue-policy");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const result = await listCreatorAdMonetizationProfiles({
    status: searchParams.get("status") ?? undefined,
    kyc_status: searchParams.get("kyc_status") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    limit: 500,
    offset: 0
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const header = [
    "username",
    "user_id",
    "status",
    "kyc_status",
    "tax_status",
    "payout_status",
    "ads_revenue_enabled",
    "fraud_hold",
    "estimated_revenue_month_vnd",
    "has_fraud_signal"
  ];
  const rows = result.profiles.map((p) =>
    [
      p.username,
      p.user_id,
      CREATOR_AD_STATUS_LABELS[p.status] ?? p.status,
      p.kyc_status,
      p.tax_status,
      p.payout_status,
      p.ads_revenue_enabled,
      p.fraud_hold,
      p.estimated_revenue_month_vnd ?? 0,
      p.has_fraud_signal ?? false
    ]
      .map(csvEscape)
      .join(",")
  );

  const csv = [header.join(","), ...rows].join("\n");
  const filename = `creator-ad-profiles-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
