import { NextResponse } from "next/server";
import { processPendingEmails } from "@/lib/email/email-service";

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
    const limitParam = new URL(request.url).searchParams.get("limit");
    const limit = limitParam ? Number.parseInt(limitParam, 10) : 20;
    const result = await processPendingEmails(Number.isFinite(limit) ? limit : 20);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Xử lý email_jobs thất bại."
      },
      { status: 500 }
    );
  }
}
