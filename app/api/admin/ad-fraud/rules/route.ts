import { NextResponse } from "next/server";
import { listAdFraudRules, updateAdFraudRule } from "@/lib/ads/fraud-rules";
import {
  requireFinanceSettingsUpdate,
  requireFinanceSettingsView
} from "@/lib/auth/require-permission";
import type { AdFraudRuleInput } from "@/types/ad-fraud";

export async function GET() {
  const guard = await requireFinanceSettingsView("/admin/ad-fraud");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: 403 });
  }
  const result = await listAdFraudRules();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ rules: result.rules });
}

export async function PATCH(request: Request) {
  const guard = await requireFinanceSettingsUpdate();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error ?? "Forbidden" }, { status: 403 });
  }

  let body: { rule_key: string } & AdFraudRuleInput;
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.rule_key) {
    return NextResponse.json({ error: "rule_key required" }, { status: 400 });
  }

  if (body.threshold_config !== undefined && typeof body.threshold_config === "string") {
    try {
      body.threshold_config = JSON.parse(body.threshold_config) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "threshold_config JSON không hợp lệ" }, { status: 400 });
    }
  }

  const { rule_key, ...input } = body;
  const result = await updateAdFraudRule(rule_key, input);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ rule: result.rule });
}
