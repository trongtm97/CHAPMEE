import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { executeChaptersImportV2Action } from "@/lib/studio/import-export-v2-server";
import { studioPath } from "@/lib/studio/constants";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const { user } = await getCurrentProfile();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập.", created: 0, updated: 0, errors: [] }, { status: 401 });
  }

  const access = await getStudioAccess(studioPath("/import"));
  if (access.error || !access.creatorProfile) {
    return NextResponse.json(
      { error: access.error ?? "Không có quyền Studio.", created: 0, updated: 0, errors: [] },
      { status: 403 }
    );
  }

  const csvText = await request.text();
  const result = await executeChaptersImportV2Action({ csvText });
  return NextResponse.json(result);
}
