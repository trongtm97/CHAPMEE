import { NextResponse } from "next/server";
import { getCurrentAuthContext } from "@/lib/auth/permissions";

const VIEW_PERMISSIONS = [
  "taxonomy.view",
  "admin.settings.view",
  "admin.settings.update",
  "admin.dashboard.view"
] as const;

export async function requireTaxonomyAnalyticsView() {
  const context = await getCurrentAuthContext();
  if (!context) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "Bạn cần đăng nhập." }, { status: 401 })
    };
  }

  const canView = VIEW_PERMISSIONS.some((permission) =>
    context.permissions.includes(permission)
  );

  if (!canView) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "Bạn không có quyền xem taxonomy analytics." },
        { status: 403 }
      )
    };
  }

  return { ok: true as const, context };
}

export async function requireTaxonomyAnalyticsRebuild() {
  const context = await getCurrentAuthContext();
  if (!context) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "Bạn cần đăng nhập." }, { status: 401 })
    };
  }

  const canRebuild = context.permissions.includes("admin.settings.update");
  if (!canRebuild) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "Bạn không có quyền rebuild taxonomy aggregate." },
        { status: 403 }
      )
    };
  }

  return { ok: true as const, context };
}
