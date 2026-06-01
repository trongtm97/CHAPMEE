import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { getCreatorAdRevenueEstimate } from "@/lib/ads/get-creator-ad-revenue-estimate";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";

export async function GET() {
  const { user } = await getCurrentProfile();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const access = await getStudioAccess("/studio/finance");
  if (access.error || !access.creatorProfile) {
    return NextResponse.json({ error: access.error ?? "forbidden" }, { status: 403 });
  }

  const result = await getCreatorAdRevenueEstimate(user.id);
  if (!result.visible) {
    return NextResponse.json({ visible: false, data: null });
  }

  return NextResponse.json({
    visible: true,
    data: result.data,
    error: result.error
  });
}
