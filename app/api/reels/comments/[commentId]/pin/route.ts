import { NextResponse } from "next/server";
import { pinComment } from "@/lib/comments/pinComment";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{
    commentId: string;
  }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  const { commentId } = await params;
  const body = (await request.json()) as { pinned?: boolean };
  const result = await pinComment(commentId, Boolean(body.pinned));

  return NextResponse.json(
    { error: result.error, ok: result.ok },
    { status: result.status }
  );
}
