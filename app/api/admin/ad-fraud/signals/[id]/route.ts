import { NextResponse } from "next/server";
import { updateAdFraudSignalStatus } from "@/lib/ads/fraud-signals";
import { requireFinanceSettingsUpdate } from "@/lib/auth/require-permission";
import type { AdFraudSignalStatus } from "@/types/ad-fraud";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const guard = await requireFinanceSettingsUpdate();
  if (!guard.ok || !guard.context) {
    return NextResponse.json({ error: guard.error ?? "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  let body: { status: AdFraudSignalStatus; admin_note?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const result = await updateAdFraudSignalStatus({
    signalId: id,
    status: body.status,
    adminNote: body.admin_note,
    actorId: guard.context.userId
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ signal: result.signal });
}
