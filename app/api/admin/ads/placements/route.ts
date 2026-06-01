import { NextResponse } from "next/server";
import {
  createAdPlacementAdmin,
  listAdPlacementsAdmin
} from "@/lib/ads/admin/placements";
import { validatePlacementForm } from "@/lib/ads/validate-placement-form";
import {
  requireFinanceSettingsUpdate,
  requireFinanceSettingsView
} from "@/lib/auth/require-permission";
import type { AdPlacementFormInput, AdPlacementListFilters } from "@/types/ads";

export async function GET(request: Request) {
  const guard = await requireFinanceSettingsView("/admin/ads");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const filters: AdPlacementListFilters = {
    surface: searchParams.get("surface") ?? undefined,
    device: (searchParams.get("device") as AdPlacementListFilters["device"]) ?? undefined,
    enabled: (searchParams.get("enabled") as AdPlacementListFilters["enabled"]) ?? undefined,
    testMode: (searchParams.get("testMode") as AdPlacementListFilters["testMode"]) ?? undefined,
    mode: (searchParams.get("mode") as AdPlacementListFilters["mode"]) ?? undefined,
    adFormat: (searchParams.get("adFormat") as AdPlacementListFilters["adFormat"]) ?? undefined,
    risk: (searchParams.get("risk") as AdPlacementListFilters["risk"]) ?? undefined,
    search: searchParams.get("q") ?? undefined,
    page: Number(searchParams.get("page") ?? 1),
    pageSize: Number(searchParams.get("pageSize") ?? 20)
  };

  const result = await listAdPlacementsAdmin(filters);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const guard = await requireFinanceSettingsUpdate();
  if (!guard.ok || !guard.context) {
    return NextResponse.json({ error: guard.error ?? "Forbidden" }, { status: 403 });
  }

  let body: AdPlacementFormInput;
  try {
    body = (await request.json()) as AdPlacementFormInput;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const validation = validatePlacementForm(body);
  if (!validation.ok) {
    return NextResponse.json(
      { error: Object.values(validation.errors)[0] ?? "Dữ liệu không hợp lệ.", errors: validation.errors },
      { status: 400 }
    );
  }

  const result = await createAdPlacementAdmin(body, guard.context.userId);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ item: result.item, warnings: validation.warnings });
}
