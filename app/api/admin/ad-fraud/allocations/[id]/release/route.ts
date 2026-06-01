import { NextResponse } from "next/server";
import { releaseCreatorAllocationHold } from "@/lib/ads/fraud-allocation";
import { requireFinanceSettingsUpdate } from "@/lib/auth/require-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const guard = await requireFinanceSettingsUpdate();
  if (!guard.ok || !guard.context) {
    return NextResponse.json({ error: guard.error ?? "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  let body: { reason: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const result = await releaseCreatorAllocationHold({
    allocationId: id,
    reason: body.reason,
    actorId: guard.context.userId
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ allocation: result.allocation });
}
