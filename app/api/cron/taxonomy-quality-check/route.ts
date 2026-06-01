import { NextResponse } from "next/server";
import { runTaxonomyQualityBatchCheck } from "@/lib/content-taxonomy-quality/rule-engine";
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
    const limit = Number(url.searchParams.get("limit") ?? "200");
    const offset = Number(url.searchParams.get("offset") ?? "0");
    const supabase = createAdminClient();
    const result = await runTaxonomyQualityBatchCheck(supabase, {
      limit: Number.isFinite(limit) ? limit : 200,
      offset: Number.isFinite(offset) ? offset : 0
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      processed: result.processed,
      totalStories: result.totalStories,
      nextOffset: result.nextOffset,
      hint:
        result.nextOffset === 0
          ? "Đã quét hết batch; lần chạy tiếp theo bắt đầu từ offset=0."
          : `Lần chạy tiếp: ?offset=${result.nextOffset}&limit=${limit}`
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Taxonomy quality cron failed."
      },
      { status: 500 }
    );
  }
}
