import { NextResponse } from "next/server";
import { insertCommunityPost } from "@/lib/community/insert-community-post";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: {
    content?: string;
    type?: string;
    storyId?: string | null;
    episodeNumber?: number | null;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const result = await insertCommunityPost({
    content: body.content ?? "",
    type: body.type,
    storyId: body.storyId ?? null,
    episodeNumber: body.episodeNumber ?? null
  });

  if (!result.ok) {
    const status = result.error.includes("đăng nhập") ? 401 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ postId: result.postId });
}
