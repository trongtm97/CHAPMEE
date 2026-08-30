import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/data/public-client";
import { getRankingBoard } from "@/lib/ranking/get-board";
import { parseRankingRangeParam } from "@/lib/ranking/parse-ranking-range";
import type { RankingBoardType } from "@/types/ranking-board";
import { RANKING_BOARD_TYPES } from "@/types/ranking-board";

export const dynamic = "force-dynamic";

function parseBoardType(value: string | null): RankingBoardType {
  if (value && RANKING_BOARD_TYPES.includes(value as RankingBoardType)) {
    return value as RankingBoardType;
  }
  return "top_stories";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const boardType = parseBoardType(searchParams.get("type"));
  const timeWindow = parseRankingRangeParam(
    searchParams.get("range"),
    searchParams.get("window")
  );
  const genreSlug = searchParams.get("genre");
  const page = Number(searchParams.get("page") ?? "1");

  const db = createPublicClient();
  const result = await getRankingBoard(db, {
    boardType,
    timeWindow,
    genreSlug,
    page: Number.isFinite(page) ? page : 1
  });

  return NextResponse.json(result);
}
