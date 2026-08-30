import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { createClient } from "@/lib/data/server";
import { listUserLibraryImages } from "@/lib/media/list-user-images";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await createClient();
    const { images } = await listUserLibraryImages(db, user.id);
    return NextResponse.json({ images });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể tải thư viện ảnh.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
