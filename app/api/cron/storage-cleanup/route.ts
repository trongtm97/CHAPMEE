import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/data/admin";
import { runStorageGarbageCollection } from "@/lib/storage/garbage-collection";

export const dynamic = "force-dynamic";

function authorizeCron(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return { ok: false as const, status: 500, error: "CRON_SECRET chưa được cấu hình." };
  }

  const authHeader = request.headers.get("authorization");
  const querySecret = new URL(request.url).searchParams.get("secret");
  const dryRun = new URL(request.url).searchParams.get("dry_run") === "1";

  if (authHeader !== `Bearer ${secret}` && querySecret !== secret) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }

  return { ok: true as const, dryRun };
}

export async function GET(request: Request) {
  const auth = authorizeCron(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const db = createAdminClient();
    const result = await runStorageGarbageCollection(db, { dryRun: auth.dryRun });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Cron storage cleanup thất bại."
      },
      { status: 500 }
    );
  }
}
