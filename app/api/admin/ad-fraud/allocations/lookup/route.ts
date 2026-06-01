import { NextResponse } from "next/server";
import { findAllocationsForAuthorMonth } from "@/lib/ads/fraud-allocation";
import { requireFinanceSettingsView } from "@/lib/auth/require-permission";

export async function GET(request: Request) {
  const guard = await requireFinanceSettingsView("/admin/ad-fraud");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const authorId = searchParams.get("author_id");
  const month = searchParams.get("month");
  if (!authorId || !month) {
    return NextResponse.json({ allocations: [] });
  }

  const allocations = await findAllocationsForAuthorMonth(authorId, month);
  return NextResponse.json({ allocations });
}
