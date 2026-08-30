import { NextResponse } from "next/server";
import { publishScheduledItems } from "@/lib/studio/scheduling/publish-scheduled-items";
import { createAdminClient } from "@/lib/data/admin";

export const dynamic = "force-dynamic";

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
    const result = await publishScheduledItems(db);

    return NextResponse.json({
      failed: result.failed,
      published: result.published
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Cron publish thất bại."
      },
      { status: 500 }
    );
  }
}
