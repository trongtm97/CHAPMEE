import { NextResponse } from "next/server";
import { toggleCommentLike } from "@/lib/comments/toggleCommentLike";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{
    commentId: string;
  }>;
};

export async function POST(_request: Request, { params }: RouteProps) {
  const { commentId } = await params;
  const result = await toggleCommentLike(commentId);

  if (!result.ok) {
    return NextResponse.json({ loginUrl: result.loginUrl }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
