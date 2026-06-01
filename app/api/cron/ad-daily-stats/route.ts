import { NextResponse } from "next/server";
import { rebuildAdRevenueStats } from "@/lib/ads/rebuildAdRevenueStats";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function yesterdayIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET chưa được cấu hình." }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  const querySecret = new URL(request.url).searchParams.get("secret");
  if (authHeader !== `Bearer ${secret}` && querySecret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const from = new URL(request.url).searchParams.get("from") ?? yesterdayIso();
  const to = new URL(request.url).searchParams.get("to") ?? todayIso();

  const result = await rebuildAdRevenueStats({ from, to });
  if (!result.ok) {
    return NextResponse.json({ error: result.error, warnings: result.warnings }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    from,
    to,
    dailyRows: result.dailyRows,
    monthlyUpserts: result.monthlyUpserts,
    warnings: result.warnings
  });
}
