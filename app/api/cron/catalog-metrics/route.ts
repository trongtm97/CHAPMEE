import { NextResponse } from "next/server";
import { refreshStoryCatalogMetrics } from "@/lib/stories/catalog-metrics-view";
import { invalidateStoryCatalogCache } from "@/lib/stories/getPublicStoriesCatalogCached";
import { createAdminClient } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET chưa được cấu hình." },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  const querySecret = new URL(request.url).searchParams.get("secret");

  if (authHeader !== `Bearer ${secret}` && querySecret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const result = await refreshStoryCatalogMetrics(supabase);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    invalidateStoryCatalogCache();
    return NextResponse.json({ ok: true, refreshed: "story_catalog_metrics" });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Catalog metrics cron failed."
      },
      { status: 500 }
    );
  }
}
