import { NextResponse } from "next/server";
import { duplicateAdPlacementAdmin } from "@/lib/ads/admin/placements";
import { requireFinanceSettingsUpdate } from "@/lib/auth/require-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const guard = await requireFinanceSettingsUpdate();
  if (!guard.ok || !guard.context) {
    return NextResponse.json({ error: guard.error ?? "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const result = await duplicateAdPlacementAdmin(id, guard.context.userId);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ item: result.item });
}
