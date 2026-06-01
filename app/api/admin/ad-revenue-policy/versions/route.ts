import { NextResponse } from "next/server";
import {
  listCreatorAdPolicyVersions,
  saveCreatorAdPolicyDraftVersion
} from "@/lib/creator-ad-revenue/policy-versions";
import { getCreatorAdRevenuePolicy } from "@/lib/creator-ad-revenue/policy";
import { requireFinanceSettingsView, requireFinanceSettingsUpdate } from "@/lib/auth/require-permission";

export async function GET() {
  const guard = await requireFinanceSettingsView("/admin/ad-revenue-policy");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: 403 });
  }

  const result = await listCreatorAdPolicyVersions(30);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ versions: result.versions });
}

export async function POST() {
  const guard = await requireFinanceSettingsUpdate();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: 403 });
  }

  const policy = await getCreatorAdRevenuePolicy({ useAdmin: true });
  const result = await saveCreatorAdPolicyDraftVersion({
    policy,
    actorId: guard.context!.userId
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ version: result.version });
}
