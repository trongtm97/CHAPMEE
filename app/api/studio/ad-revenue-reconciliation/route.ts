import { NextResponse } from "next/server";
import { getCreatorReconciledAdRevenueMonths } from "@/lib/ads/reconciliation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";

export async function GET() {
  const { profile } = await getCurrentUser();
  if (!profile?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const access = await getStudioAccess("/studio/finance");
  if (!access.creatorProfile) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const result = await getCreatorReconciledAdRevenueMonths(profile.id);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    months: result.months,
    estimatesVisible: result.estimatesVisible
  });
}
