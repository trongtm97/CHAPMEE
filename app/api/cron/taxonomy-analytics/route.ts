import { NextResponse } from "next/server";
import {
  aggregateTaxonomyDailyMetrics,
  aggregateTaxonomyDateRange,
  defaultAggregationDate
} from "@/lib/taxonomy-analytics/aggregate-daily";
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
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");

  if (authHeader !== `Bearer ${secret}` && querySecret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const date = url.searchParams.get("date") ?? defaultAggregationDate();

    if (from && to) {
      const results = await aggregateTaxonomyDateRange(supabase, from, to);
      const failed = results.find((row) => !row.ok);
      if (failed) {
        return NextResponse.json({ error: failed.error }, { status: 500 });
      }
      return NextResponse.json({
        ok: true,
        processedDays: results.length,
        termsProcessed: results.reduce((sum, row) => sum + row.termsProcessed, 0)
      });
    }

    const result = await aggregateTaxonomyDailyMetrics(supabase, date);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      date: result.date,
      termsProcessed: result.termsProcessed
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Taxonomy analytics cron failed."
      },
      { status: 500 }
    );
  }
}
