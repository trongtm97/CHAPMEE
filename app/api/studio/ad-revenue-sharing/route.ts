import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getCreatorAdSharingStatusForStudio } from "@/lib/creator-ad-revenue/get-creator-sharing-status";
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

  const status = await getCreatorAdSharingStatusForStudio(profile.id);
  return NextResponse.json({ status });
}
