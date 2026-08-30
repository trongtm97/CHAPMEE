import { NextResponse } from "next/server";
import { ensureProfileForUser } from "@/lib/auth/ensure-profile";
import { getSessionUser } from "@/lib/auth/get-session-user";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let displayName: string | undefined;
  try {
    const body = (await request.json()) as { displayName?: string };
    displayName = body.displayName;
  } catch {
    displayName = undefined;
  }

  try {
    await ensureProfileForUser({
      userId: user.id,
      email: user.email,
      displayName: displayName ?? user.name
    });

    const { maybeAwardDailyActivityTickets } = await import(
      "@/lib/recommendations/award-daily-activity"
    );
    await maybeAwardDailyActivityTickets(user.id).catch((error) => {
      console.error("[recommendation-tickets] daily activity on login failed", error);
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not initialize profile";
    console.error("[ensure-profile]", message, error);
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "production"
            ? "Could not initialize profile"
            : message
      },
      { status: 500 }
    );
  }
}
