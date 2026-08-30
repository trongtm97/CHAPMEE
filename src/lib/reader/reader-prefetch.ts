"use client";

export type ReaderPrefetchReason = "idle" | "scroll" | "hover" | "focus" | "manual";

export type ChapterPrefetchTarget = {
  chapterId: string | null;
  storyId: string;
  href: string | null;
  contentHash?: string | null;
  updatedAt?: string | null;
  allowContentPrefetch?: boolean;
};

export type ChapterPrefetchEntry = {
  chapterId: string;
  storyId: string;
  contentHash: string | null;
  updatedAt: string | null;
  content: string;
  structuredContent: unknown | null;
  cachedAt: number;
  source: string | null;
};

type ChapterContentPayload = {
  accessStatus?: "full" | "locked" | "forbidden" | "not_found";
  content?: string;
  structuredContent?: unknown | null;
  source?: string | null;
  protection?: {
    contentHash?: string | null;
  };
  error?: string;
};

const MAX_CHAPTER_CACHE_ENTRIES = 5;
const PREFETCH_FETCH_TIMEOUT_MS = 8000;
const pendingPrefetches = new Map<string, { controller: AbortController; promise: Promise<ChapterPrefetchEntry | null> }>();
const chapterCache = new Map<string, ChapterPrefetchEntry>();
let activeStoryId: string | null = null;

function devLog(message: string, meta?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }
  console.info(`[reader-prefetch] ${message}`, meta ?? {});
}

function cacheKey(chapterId: string, contentHash?: string | null, updatedAt?: string | null) {
  return `${chapterId}:${contentHash ?? "no-hash"}:${updatedAt ?? "no-updated-at"}`;
}

function trimCache() {
  while (chapterCache.size > MAX_CHAPTER_CACHE_ENTRIES) {
    const oldestKey = chapterCache.keys().next().value as string | undefined;
    if (!oldestKey) {
      return;
    }
    chapterCache.delete(oldestKey);
  }
}

function getConnectionInfo() {
  if (typeof navigator === "undefined") {
    return null;
  }
  return (navigator as Navigator & {
    connection?: {
      saveData?: boolean;
      effectiveType?: string;
    };
  }).connection ?? null;
}

export function shouldSkipReaderPrefetch() {
  if (typeof window === "undefined") {
    return "server";
  }

  const connection = getConnectionInfo();
  if (connection?.saveData) {
    return "saveData";
  }
  if (connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g") {
    return "slow-network";
  }
  if (/^\/(admin|studio|me)(\/|$)/.test(window.location.pathname)) {
    return "private-route";
  }

  return null;
}

export function resetReaderPrefetchForStory(storyId: string) {
  if (activeStoryId === storyId) {
    return;
  }

  for (const pending of pendingPrefetches.values()) {
    pending.controller.abort();
  }
  pendingPrefetches.clear();
  chapterCache.clear();
  activeStoryId = storyId;
  devLog("cache reset for story", { storyId });
}

export function seedChapterPrefetchCache(target: ChapterPrefetchTarget, data: {
  content: string;
  structuredContent: unknown | null;
  source?: string | null;
}) {
  if (!target.chapterId || !target.allowContentPrefetch) {
    return;
  }

  const key = cacheKey(target.chapterId, target.contentHash, target.updatedAt);
  chapterCache.set(key, {
    cachedAt: Date.now(),
    chapterId: target.chapterId,
    content: data.content,
    contentHash: target.contentHash ?? null,
    source: data.source ?? "current",
    storyId: target.storyId,
    structuredContent: data.structuredContent,
    updatedAt: target.updatedAt ?? null
  });
  trimCache();
}

export function getPrefetchedChapter(target: ChapterPrefetchTarget | null | undefined) {
  if (!target?.chapterId) {
    return null;
  }

  const key = cacheKey(target.chapterId, target.contentHash, target.updatedAt);
  const hit = chapterCache.get(key) ?? null;
  devLog(hit ? "cache hit" : "cache miss", { chapterId: target.chapterId });
  return hit;
}

export async function prefetchChapterContent(
  target: ChapterPrefetchTarget,
  reason: ReaderPrefetchReason
) {
  if (!target.chapterId || !target.allowContentPrefetch) {
    devLog("prefetch skipped", { reason, skip: "no-target-or-content-disabled" });
    return null;
  }

  const skip = shouldSkipReaderPrefetch();
  if (skip) {
    devLog("prefetch skipped", { reason, skip, chapterId: target.chapterId });
    return null;
  }

  const key = cacheKey(target.chapterId, target.contentHash, target.updatedAt);
  const cached = chapterCache.get(key);
  if (cached) {
    devLog("prefetch cache hit", { reason, chapterId: target.chapterId });
    return cached;
  }

  const pending = pendingPrefetches.get(key);
  if (pending) {
    devLog("prefetch joined pending", { reason, chapterId: target.chapterId });
    return pending.promise;
  }

  const controller = new AbortController();
  let timedOut = false;
  const timeout = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, PREFETCH_FETCH_TIMEOUT_MS);
  const params = new URLSearchParams({ chapterId: target.chapterId, prefetch: "1" });
  devLog("prefetch started", { reason, chapterId: target.chapterId });

  const promise = fetch(`/api/reader/chapter-content?${params.toString()}`, {
    cache: "no-store",
    signal: controller.signal
  })
    .then(async (response) => {
      if (!response.ok) {
        devLog("prefetch skipped", {
          reason,
          chapterId: target.chapterId,
          status: response.status
        });
        return null;
      }

      const payload = (await response.json()) as ChapterContentPayload;
      if (payload.accessStatus && payload.accessStatus !== "full") {
        devLog("prefetch skipped", {
          reason,
          chapterId: target.chapterId,
          accessStatus: payload.accessStatus
        });
        return null;
      }
      if (typeof payload.content !== "string") {
        return null;
      }

      const entry: ChapterPrefetchEntry = {
        cachedAt: Date.now(),
        chapterId: target.chapterId!,
        content: payload.content,
        contentHash: payload.protection?.contentHash ?? target.contentHash ?? null,
        source: payload.source ?? null,
        storyId: target.storyId,
        structuredContent: payload.structuredContent ?? null,
        updatedAt: target.updatedAt ?? null
      };
      chapterCache.set(key, entry);
      trimCache();
      devLog("prefetch stored", { reason, chapterId: target.chapterId });
      return entry;
    })
    .catch((error) => {
      if (error instanceof DOMException && error.name === "AbortError") {
        devLog(timedOut ? "prefetch timed out" : "prefetch aborted", {
          reason,
          chapterId: target.chapterId,
          timeoutMs: timedOut ? PREFETCH_FETCH_TIMEOUT_MS : undefined
        });
        return null;
      }
      devLog("prefetch error", {
        reason,
        chapterId: target.chapterId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    })
    .finally(() => {
      window.clearTimeout(timeout);
      pendingPrefetches.delete(key);
    });

  pendingPrefetches.set(key, { controller, promise });
  return promise;
}

export function abortChapterPrefetch(target: ChapterPrefetchTarget | null | undefined) {
  if (!target?.chapterId) {
    return;
  }
  const key = cacheKey(target.chapterId, target.contentHash, target.updatedAt);
  pendingPrefetches.get(key)?.controller.abort();
  pendingPrefetches.delete(key);
}
