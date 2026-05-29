import { NextResponse } from "next/server";
import { getSwipeItems } from "@/lib/swipe/getSwipeItems";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "12");
  const offset = Number(searchParams.get("offset") ?? "0");
  const result = await getSwipeItems({ limit, offset });

  return NextResponse.json(result);
}
