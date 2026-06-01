import { NextResponse } from "next/server";
import { getCreatorAdRevenuePolicy, updateCreatorAdRevenuePolicy } from "@/lib/creator-ad-revenue/policy";
import {
  requireFinanceSettingsUpdate,
  requireFinanceSettingsView
} from "@/lib/auth/require-permission";
import { validateCreatorAdRevenuePolicy } from "@/lib/creator-ad-revenue/policy-validation";
import type { CreatorAdRevenuePolicyInput } from "@/types/creator-ad-revenue-policy";

export async function GET() {
  const guard = await requireFinanceSettingsView("/admin/ad-revenue-policy");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: 403 });
  }

  const policy = await getCreatorAdRevenuePolicy({ useAdmin: true });
  return NextResponse.json({ policy });
}

export async function PATCH(request: Request) {
  const guard = await requireFinanceSettingsUpdate();
  if (!guard.ok || !guard.context) {
    return NextResponse.json({ error: guard.error ?? "Forbidden" }, { status: 403 });
  }

  let body: CreatorAdRevenuePolicyInput & { audit_note?: string };
  try {
    body = (await request.json()) as CreatorAdRevenuePolicyInput & { audit_note?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { audit_note, ...policyInput } = body;
  const validation = validateCreatorAdRevenuePolicy(policyInput);
  if (!validation.ok) {
    return NextResponse.json(
      { error: Object.values(validation.errors)[0] ?? "Dữ liệu không hợp lệ." },
      { status: 400 }
    );
  }

  const result = await updateCreatorAdRevenuePolicy(policyInput, guard.context.userId, {
    auditNote: audit_note
  });
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ policy: result.policy });
}
