import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type CheckStatus = "ok" | "skipped" | "error";

async function checkDatabase(): Promise<CheckStatus> {
  if (!process.env.DATABASE_URL?.trim()) {
    return "skipped";
  }
  try {
    const { getPgPool } = await import("@/lib/db/pool");
    const pool = getPgPool();
    await Promise.race([
      pool.query("SELECT 1"),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("timeout")), 3000);
      })
    ]);
    return "ok";
  } catch {
    return "error";
  }
}

async function checkRedis(): Promise<CheckStatus> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    return "skipped";
  }
  try {
    const { default: Redis } = await import("redis");
    const client = Redis.createClient({
      url,
      socket: { connectTimeout: 2000 }
    });
    client.on("error", () => {});
    await client.connect();
    const pong = await client.ping();
    await client.quit();
    return pong === "PONG" ? "ok" : "error";
  } catch {
    return "error";
  }
}

export async function GET(request: Request) {
  const deep = new URL(request.url).searchParams.get("deep") === "1";

  const checks: Record<string, CheckStatus> = {
    server: "ok"
  };

  if (deep) {
    checks.database = await checkDatabase();
    checks.redis = await checkRedis();
  }

  const ok = Object.values(checks).every((status) => status === "ok" || status === "skipped");

  return NextResponse.json(
    {
      ok,
      app: "ChapMee",
      time: new Date().toISOString(),
      checks
    },
    { status: ok ? 200 : 503 }
  );
}
