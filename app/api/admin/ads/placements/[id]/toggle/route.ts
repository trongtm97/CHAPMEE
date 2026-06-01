import { NextResponse } from "next/server";
import { toggleAdPlacementAdmin } from "@/lib/ads/admin/placements";
import { requireFinanceSettingsUpdate } from "@/lib/auth/require-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const guard = await requireFinanceSettingsUpdate();
  if (!guard.ok || !guard.context) {
    return NextResponse.json({ error: guard.error ?? "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  let isEnabled: boolean;
  try {
    const body = (await request.json()) as { isEnabled?: boolean };
    isEnabled = Boolean(body.isEnabled);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const result = await toggleAdPlacementAdmin(id, isEnabled, guard.context.userId);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
