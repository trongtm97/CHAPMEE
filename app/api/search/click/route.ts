import { NextResponse } from "next/server";
import { trackSearchClick } from "@/lib/search/track-search";
import { createClient } from "@/lib/data/server";
import type { SearchResultType } from "@/types/search";

export const dynamic = "force-dynamic";

type ClickBody = {
  query?: string;
  requestId?: string;
  algorithmVersion?: string;
  resultType?: SearchResultType;
  itemId?: string;
  position?: number;
};

export async function POST(request: Request) {
  const body = (await request.json()) as ClickBody;
  if (!body.itemId || !body.resultType || !body.requestId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const db = await createClient();
  const {
    data: { user }
  } = await db.auth.getUser();

  await trackSearchClick(
    body.query ?? "",
    { resultType: body.resultType, itemId: body.itemId },
    body.position ?? 0,
    {
      requestId: body.requestId,
      algorithmVersion: body.algorithmVersion ?? "1.0.0",
      userId: user?.id ?? null
    }
  );

  return NextResponse.json({ ok: true });
}
