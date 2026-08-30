import { NextResponse } from "next/server";
import { generateRankingSnapshots } from "@/lib/ranking/generate-snapshots";
import { createAdminClient } from "@/lib/data/admin";

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
    const db = createAdminClient();
    const result = await generateRankingSnapshots(db);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Ranking snapshot cron failed."
      },
      { status: 500 }
    );
  }
}
