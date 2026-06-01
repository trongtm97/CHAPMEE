import { NextResponse } from "next/server";
import { detectAdFraudSignals } from "@/lib/ads/fraudDetection";
import { requireFinanceSettingsUpdate } from "@/lib/auth/require-permission";

export async function POST(request: Request) {
  const guard = await requireFinanceSettingsUpdate();
  if (!guard.ok || !guard.context) {
    return NextResponse.json({ error: guard.error ?? "Forbidden" }, { status: 403 });
  }

  let body: { from?: string; to?: string; month?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const result = await detectAdFraudSignals({
    ...body,
    actorId: guard.context.userId
  });

  return NextResponse.json(result);
}
