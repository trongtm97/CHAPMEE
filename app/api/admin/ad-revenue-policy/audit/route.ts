import { NextResponse } from "next/server";
import { listCreatorAdPolicyAuditLogs } from "@/lib/creator-ad-revenue/audit";
import { requireFinanceSettingsView } from "@/lib/auth/require-permission";

export async function GET(request: Request) {
  const guard = await requireFinanceSettingsView("/admin/ad-revenue-policy");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const result = await listCreatorAdPolicyAuditLogs({
    limit: Number(searchParams.get("limit") ?? 50),
    targetUserId: searchParams.get("targetUserId") ?? undefined,
    action: searchParams.get("action") ?? undefined
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ logs: result.logs });
}
