"use client";

import { useEffect, useReducer, useState } from "react";
import type {
  RankingBoardItem,
  RankingBoardResult,
  RankingUiTab,
  RankingUiTabId
} from "@/types/ranking-board";
import { findRankingTabById, RANKING_UI_TABS } from "@/types/ranking-board";
import { isAbortError, useLatestRequestGuard } from "@/hooks/useLatestRequestGuard";

type BoardState = {
  result: RankingBoardResult | null;
  loading: boolean;
  error: string | null;
};

type BoardAction =
  | { type: "loading" }
  | { type: "success"; result: RankingBoardResult }
  | { type: "error"; error: string };

function boardReducer(_state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case "loading":
      return { result: null, loading: true, error: null };
    case "success":
      return { result: action.result, loading: false, error: null };
    case "error":
      return { result: null, loading: false, error: action.error };
  }
}

export type GenreOption = { slug: string; name: string };

async function fetchBoard(params: {
  tab: RankingUiTab;
  genreSlug: string | null;
  page: number;
  signal?: AbortSignal;
}) {
  const query = new URLSearchParams({
    type: params.tab.boardType,
    window: params.tab.timeWindow,
    page: String(params.page)
  });
  if (params.genreSlug) {
    query.set("genre", params.genreSlug);
  }

  const response = await fetch(`/api/rankings/board?${query.toString()}`, {
    signal: params.signal
  });
  if (!response.ok) {
    throw new Error("Cannot load ranking data.");
  }
  return (await response.json()) as RankingBoardResult;
}

export function useRankingBoard(
  initialTabId: RankingUiTabId = "week",
  initialGenreSlug: string | null = null
) {
  const [activeTabId, setActiveTabId] = useState<RankingUiTabId>(initialTabId);
  const [genreSlug, setGenreSlug] = useState<string | null>(initialGenreSlug);
  const [page, setPage] = useState(1);
  const [state, dispatch] = useReducer(boardReducer, {
    result: null,
    loading: true,
    error: null
  });
  const requestGuard = useLatestRequestGuard();

  const activeTab = findRankingTabById(activeTabId);

  useEffect(() => {
    const requestId = requestGuard.nextRequestId();
    const controller = new AbortController();

    dispatch({ type: "loading" });
    void (async () => {
      try {
        const result = await fetchBoard({
          tab: activeTab,
          genreSlug: activeTab.showGenreFilter ? genreSlug : null,
          page,
          signal: controller.signal
        });
        if (!requestGuard.onlyLatest(requestId)) {
          return;
        }
        if (result.error) {
          dispatch({ type: "error", error: result.error });
          return;
        }
        dispatch({ type: "success", result });
      } catch (error) {
        if (isAbortError(error) || !requestGuard.onlyLatest(requestId)) {
          return;
        }
        dispatch({ type: "error", error: "Khong the tai du lieu xep hang." });
      }
    })();

    return () => {
      controller.abort();
    };
  }, [activeTab, genreSlug, page, requestGuard]);

  const setActiveTab = (tabId: RankingUiTabId) => {
    setActiveTabId(tabId);
    setPage(1);
  };

  return {
    tabs: RANKING_UI_TABS,
    activeTabId,
    activeTab,
    setActiveTab,
    genreSlug,
    setGenreSlug: (slug: string | null) => {
      setGenreSlug(slug);
      setPage(1);
    },
    page,
    setPage,
    items: (state.result?.items ?? []) as RankingBoardItem[],
    totalPages: state.result?.totalPages ?? 0,
    totalCount: state.result?.totalCount ?? 0,
    snapshotAt: state.result?.snapshotAt ?? null,
    loading: state.loading,
    error: state.error
  };
}
