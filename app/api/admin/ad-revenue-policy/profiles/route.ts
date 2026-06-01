import { NextResponse } from "next/server";
import { listCreatorAdMonetizationProfiles } from "@/lib/creator-ad-revenue/profiles";
import { requireFinanceSettingsView } from "@/lib/auth/require-permission";

export async function GET(request: Request) {
  const guard = await requireFinanceSettingsView("/admin/ad-revenue-policy");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const result = await listCreatorAdMonetizationProfiles({
    status: searchParams.get("status") ?? undefined,
    kyc_status: searchParams.get("kyc_status") ?? undefined,
    tax_status: searchParams.get("tax_status") ?? undefined,
    payout_status: searchParams.get("payout_status") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    limit: Number(searchParams.get("limit") ?? 50),
    offset: Number(searchParams.get("offset") ?? 0)
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ profiles: result.profiles, total: result.total });
}
