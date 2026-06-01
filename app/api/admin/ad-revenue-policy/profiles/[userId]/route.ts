import { NextResponse } from "next/server";
import {
  applyCreatorAdProfileAdminAction,
  ensureCreatorAdMonetizationProfile,
  getCreatorAdMonetizationProfile
} from "@/lib/creator-ad-revenue/profiles";
import {
  requireFinanceSettingsUpdate,
  requireFinanceSettingsView
} from "@/lib/auth/require-permission";
import type { AdminCreatorAdProfileAction } from "@/types/creator-ad-revenue-policy";

type RouteContext = { params: Promise<{ userId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const guard = await requireFinanceSettingsView("/admin/ad-revenue-policy");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: 403 });
  }

  const { userId } = await context.params;
  const profile = await getCreatorAdMonetizationProfile(userId, { syncCompliance: true });
  return NextResponse.json({ profile });
}

export async function PUT(_request: Request, context: RouteContext) {
  const guard = await requireFinanceSettingsUpdate();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error ?? "Forbidden" }, { status: 403 });
  }

  const { userId } = await context.params;
  try {
    const profile = await ensureCreatorAdMonetizationProfile(userId);
    return NextResponse.json({ profile });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Không tạo được hồ sơ." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const guard = await requireFinanceSettingsUpdate();
  if (!guard.ok || !guard.context) {
    return NextResponse.json({ error: guard.error ?? "Forbidden" }, { status: 403 });
  }

  const { userId } = await context.params;
  let body: { action: AdminCreatorAdProfileAction; reason?: string };
  try {
    body = (await request.json()) as { action: AdminCreatorAdProfileAction; reason?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const result = await applyCreatorAdProfileAdminAction({
    userId,
    action: body.action,
    actorId: guard.context.userId,
    reason: body.reason
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ profile: result.profile });
}
