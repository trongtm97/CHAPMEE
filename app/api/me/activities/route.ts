import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getPersonalActivity } from "@/lib/me/getPersonalActivity";
import { getReaderProfile } from "@/lib/profile/getReaderProfile";
import { getMyThankYous } from "@/lib/data/thank-yous";

export const dynamic = "force-dynamic";

export async function GET() {
  const { profile, user } = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profileFallback = profile ?? {
    id: user.id,
    username: null,
    display_name: null,
    avatar_url: null,
    bio: null,
    role: "user" as const,
    created_at: new Date().toISOString()
  };

  try {
    const readerProfile = await getReaderProfile(profileFallback);
    const thankYous = await getMyThankYous(user.id, {
      earlyFanStories: readerProfile.earlyFanStories,
      topFanHighlights: readerProfile.topFanHighlights
    });
    const activities = await getPersonalActivity(user.id, readerProfile, thankYous);

    return NextResponse.json(
      { activities },
      {
        headers: {
          "Cache-Control": "private, max-age=30"
        }
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Không tải được hoạt động." },
      { status: 500 }
    );
  }
}
