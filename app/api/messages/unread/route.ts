import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { getUnreadMessageCount } from "@/lib/messages/get-unread-count";
import { getPendingMessageRequestCount } from "@/lib/messages/get-message-request-count";

export async function GET() {
  const { profile } = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ unread: 0, requests: 0 });
  }

  const [unread, requests] = await Promise.all([
    getUnreadMessageCount(profile.id),
    getPendingMessageRequestCount(profile.id)
  ]);

  return NextResponse.json({
    unread,
    requests
  });
}
