import { NextResponse } from "next/server";
import { restoreCreatorAdPolicyVersion } from "@/lib/creator-ad-revenue/policy-versions";
import { requireFinanceSettingsUpdate } from "@/lib/auth/require-permission";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireFinanceSettingsUpdate();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: 403 });
  }

  const { id } = await params;
  const result = await restoreCreatorAdPolicyVersion(id, guard.context!.userId);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ policy: result.policy });
}
