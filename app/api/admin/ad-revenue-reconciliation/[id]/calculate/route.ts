import { NextResponse } from "next/server";
import { calculateAdRevenueAllocations } from "@/lib/ads/reconciliation";
import { requireFinanceSettingsUpdate } from "@/lib/auth/require-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const guard = await requireFinanceSettingsUpdate();
  if (!guard.ok || !guard.context) {
    return NextResponse.json({ error: guard.error ?? "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const preview = searchParams.get("preview") === "true";

  const result = await calculateAdRevenueAllocations(id, {
    preview,
    actorId: preview ? undefined : guard.context.userId
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    allocations: result.allocations,
    summary: result.summary
  });
}
