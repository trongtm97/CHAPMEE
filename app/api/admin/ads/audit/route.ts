import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/data/admin";
import { requireFinanceSettingsView } from "@/lib/auth/require-permission";

export async function GET(request: Request) {
  const guard = await requireFinanceSettingsView("/admin/ads");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: 403 });
  }

  const limit = Number(new URL(request.url).searchParams.get("limit") ?? 30);
  const db = createAdminClient();
  const { data, error } = await db
    .from("admin_audit_logs")
    .select("id, action, target_type, target_id, metadata, created_at, actor_id")
    .or("target_type.eq.ad_placement,action.like.ad_placement.%")
    .order("created_at", { ascending: false })
    .limit(Math.min(50, limit));

  if (error) {
    return NextResponse.json({ logs: [], error: error.message });
  }
  return NextResponse.json({ logs: data ?? [] });
}
