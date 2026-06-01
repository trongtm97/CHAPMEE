import { NextResponse } from "next/server";
import { generateAllExposureSnapshots } from "@/lib/fairness/snapshots";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

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
    const window = (new URL(request.url).searchParams.get("window") ?? "7d") as
      | "24h"
      | "7d"
      | "30d";
    const results = await generateAllExposureSnapshots(supabase, window);
    return NextResponse.json({ ok: true, results });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Exposure snapshot cron failed."
      },
      { status: 500 }
    );
  }
}
