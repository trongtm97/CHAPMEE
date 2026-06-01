import { NextResponse } from "next/server";
import {
  archiveAdPlacementAdmin,
  getAdPlacementByIdAdmin,
  updateAdPlacementAdmin
} from "@/lib/ads/admin/placements";
import { validatePlacementForm } from "@/lib/ads/validate-placement-form";
import {
  requireFinanceSettingsUpdate,
  requireFinanceSettingsView
} from "@/lib/auth/require-permission";
import type { AdPlacementFormInput } from "@/types/ads";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const guard = await requireFinanceSettingsView("/admin/ads");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: 403 });
  }

  const { id } = await context.params;
  const result = await getAdPlacementByIdAdmin(id);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ item: result.item });
}

export async function PATCH(request: Request, context: RouteContext) {
  const guard = await requireFinanceSettingsUpdate();
  if (!guard.ok || !guard.context) {
    return NextResponse.json({ error: guard.error ?? "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  let body: Partial<AdPlacementFormInput> & { archive?: boolean };
  try {
    body = (await request.json()) as Partial<AdPlacementFormInput> & { archive?: boolean };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (body.archive) {
    const archiveResult = await archiveAdPlacementAdmin(id, guard.context.userId);
    if (archiveResult.error) {
      return NextResponse.json({ error: archiveResult.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const current = await getAdPlacementByIdAdmin(id);
  if (!current.item) {
    return NextResponse.json({ error: "Không tìm thấy placement." }, { status: 404 });
  }

  const merged: AdPlacementFormInput = {
    ...current.item,
    ...body,
    placement_key: body.placement_key ?? current.item.placement_key,
    name: body.name ?? current.item.name,
    surface: body.surface ?? current.item.surface,
    device: body.device ?? current.item.device,
    position: body.position ?? current.item.position,
    ad_format: body.ad_format ?? current.item.ad_format,
    size_mode: body.size_mode ?? current.item.size_mode
  };

  const validation = validatePlacementForm(merged, { isEdit: true });
  if (!validation.ok) {
    return NextResponse.json(
      { error: Object.values(validation.errors)[0], errors: validation.errors },
      { status: 400 }
    );
  }

  const result = await updateAdPlacementAdmin(id, body, guard.context.userId);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ item: result.item, warnings: validation.warnings });
}
