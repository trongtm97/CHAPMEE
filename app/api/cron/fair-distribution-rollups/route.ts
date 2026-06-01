import { NextResponse } from "next/server";
import { rollupFairDistributionDaily } from "@/lib/fair-distribution/rollup-daily";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await rollupFairDistributionDaily();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Rollup failed" },
      { status: 500 }
    );
  }
}
