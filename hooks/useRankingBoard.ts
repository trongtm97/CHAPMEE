"use client";

import { useEffect, useReducer, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  RankingBoardItem,
  RankingBoardResult,
  RankingTimeWindow,
  RankingUiTab,
  RankingUiTabId
} from "@/types/ranking-board";
import { findRankingTabById, RANKING_UI_TABS } from "@/types/ranking-board";
import { isAbortError, useLatestRequestGuard } from "@/hooks/useLatestRequestGuard";
import {
  parseRankingRangeParam,
  rankingRangeToQueryParam
} from "@/lib/ranking/parse-ranking-range";

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
  timeWindow: RankingTimeWindow;
  useRangeParam: boolean;
  signal?: AbortSignal;
}) {
  const query = new URLSearchParams({
    type: params.tab.boardType,
    page: String(params.page)
  });
  if (params.useRangeParam) {
    query.set("range", rankingRangeToQueryParam(params.timeWindow));
  } else {
    query.set("window", params.timeWindow);
  }
  if (params.genreSlug) {
    query.set("genre", params.genreSlug);
  }

  const response = await fetch(`/api/bang-xep-hang/board?${query.toString()}`, {
    signal: params.signal
  });
  if (!response.ok) {
    throw new Error("Cannot load ranking data.");
  }
  return (await response.json()) as RankingBoardResult;
}

export function useRankingBoard(
  initialTabId: RankingUiTabId = "week",
  initialGenreSlug: string | null = null,
  options?: { syncRangeToUrl?: boolean }
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const syncRangeToUrl =
    options?.syncRangeToUrl ?? pathname.includes("/bang-xep-hang/duoc-de-cu");

  const initialWindow = syncRangeToUrl
    ? parseRankingRangeParam(searchParams.get("range"), searchParams.get("window"))
    : findRankingTabById(initialTabId).timeWindow;
  const initialPage = syncRangeToUrl
    ? Math.max(1, Number(searchParams.get("page") ?? "1") || 1)
    : 1;

  const [activeTabId, setActiveTabId] = useState<RankingUiTabId>(initialTabId);
  const [genreSlug, setGenreSlug] = useState<string | null>(initialGenreSlug);
  const [page, setPage] = useState(initialPage);
  const [timeWindow, setTimeWindow] = useState<RankingTimeWindow>(initialWindow);
  const [state, dispatch] = useReducer(boardReducer, {
    result: null,
    loading: true,
    error: null
  });
  const requestGuard = useLatestRequestGuard();

  const activeTab = findRankingTabById(activeTabId);

  useEffect(() => {
    setActiveTabId(initialTabId);
    setGenreSlug(initialGenreSlug);
    if (!syncRangeToUrl) {
      setPage(1);
      setTimeWindow(findRankingTabById(initialTabId).timeWindow);
    }
  }, [initialTabId, initialGenreSlug, syncRangeToUrl]);

  useEffect(() => {
    if (syncRangeToUrl) return;
    setTimeWindow(activeTab.timeWindow);
    setPage(1);
  }, [activeTab.id, activeTab.timeWindow, syncRangeToUrl]);

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
          timeWindow,
          useRangeParam: syncRangeToUrl,
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
        dispatch({ type: "error", error: "Không thể tải dữ liệu xếp hạng." });
      }
    })();

    return () => {
      controller.abort();
    };
  }, [activeTab, genreSlug, page, timeWindow, requestGuard, syncRangeToUrl]);

  useEffect(() => {
    if (!syncRangeToUrl) return;
    const params = new URLSearchParams();
    params.set("range", rankingRangeToQueryParam(timeWindow));
    if (page > 1) {
      params.set("page", String(page));
    }
    const next = `${pathname}?${params.toString()}`;
    const current = `${pathname}?${searchParams.toString()}`;
    if (next !== current) {
      router.replace(next, { scroll: false });
    }
  }, [syncRangeToUrl, timeWindow, page, pathname, router, searchParams]);

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
    timeWindow,
    setTimeWindow: (window: RankingTimeWindow) => {
      setTimeWindow(window);
      setPage(1);
    },
    page,
    setPage,
    items: (state.result?.items ?? []) as RankingBoardItem[],
    totalPages: state.result?.totalPages ?? 0,
    totalCount: state.result?.totalCount ?? 0,
    snapshotAt: state.result?.snapshotAt ?? null,
    fallbackNote: state.result?.fallbackNote ?? null,
    metricsNote: state.result?.metricsNote ?? null,
    loading: state.loading,
    error: state.error
  };
}
