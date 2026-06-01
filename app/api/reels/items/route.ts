import { NextResponse } from "next/server";
import { getReelsItems } from "@/lib/reels/getReelsItems";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "12");
  const offset = Number(searchParams.get("offset") ?? "0");
  const cursor = searchParams.get("cursor");
  const result = await getReelsItems({ limit, offset, cursor });

  return NextResponse.json(result);
}
