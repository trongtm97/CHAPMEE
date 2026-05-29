import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const notificationId = searchParams.get("id");
  const nextRaw = searchParams.get("next") ?? "/notifications";

  const safeNext = nextRaw.startsWith("/") ? nextRaw : "/notifications";

  if (!notificationId) {
    return NextResponse.redirect(new URL(safeNext, origin));
  }

  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("user_id", user.id)
        .is("read_at", null);
    }
  } catch {
    // Ignore auto-read failures to keep navigation smooth.
  }

  return NextResponse.redirect(new URL(safeNext, origin));
}
