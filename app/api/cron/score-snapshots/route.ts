import { NextResponse } from "next/server";
import { generateContentScoreSnapshot } from "@/lib/scoring/snapshots";
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
    const result = await generateContentScoreSnapshot(db, {
      window: "7d",
      storyLimit: Number(new URL(request.url).searchParams.get("story_limit") ?? "150"),
      reelLimit: Number(new URL(request.url).searchParams.get("reel_limit") ?? "150"),
      chapterLimit: Number(new URL(request.url).searchParams.get("chapter_limit") ?? "75")
    });

    const { generateFdsRecommendationSnapshots } = await import(
      "@/lib/fair-distribution/generate-score-snapshots"
    );
    const fdsResult = await generateFdsRecommendationSnapshots(db, {
      storyLimit: Number(new URL(request.url).searchParams.get("story_limit") ?? "120")
    });

    return NextResponse.json({ ...result, fds: fdsResult });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Score snapshot cron failed."
      },
      { status: 500 }
    );
  }
}
