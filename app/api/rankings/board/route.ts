import { NextResponse } from "next/server";
import { getRankingBoard } from "@/lib/ranking/get-board";
import { createClient } from "@/lib/supabase/server";
import type { RankingBoardType, RankingTimeWindow } from "@/types/ranking-board";
import { RANKING_BOARD_TYPES, RANKING_TIME_WINDOWS } from "@/types/ranking-board";

export const dynamic = "force-dynamic";

function parseBoardType(value: string | null): RankingBoardType {
  if (value && RANKING_BOARD_TYPES.includes(value as RankingBoardType)) {
    return value as RankingBoardType;
  }
  return "top_stories";
}

function parseTimeWindow(value: string | null): RankingTimeWindow {
  if (value && RANKING_TIME_WINDOWS.includes(value as RankingTimeWindow)) {
    return value as RankingTimeWindow;
  }
  return "week";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const boardType = parseBoardType(searchParams.get("type"));
  const timeWindow = parseTimeWindow(searchParams.get("window"));
  const genreSlug = searchParams.get("genre");
  const page = Number(searchParams.get("page") ?? "1");

  const supabase = await createClient();
  const result = await getRankingBoard(supabase, {
    boardType,
    timeWindow,
    genreSlug,
    page: Number.isFinite(page) ? page : 1
  });

  return NextResponse.json(result);
}
