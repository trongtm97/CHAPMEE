import { readStorageItem, STORAGE_KEYS, writeStorageItem } from "@/lib/brand/storage";

export type ReadingScrollPosition = {
  storyId: string;
  episodeId: string;
  scrollPercent: number;
  lastReadAt: string;
};

function readMap(): Record<string, ReadingScrollPosition> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = readStorageItem(STORAGE_KEYS.readingScrollPositions);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, ReadingScrollPosition>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, ReadingScrollPosition>) {
  if (typeof window === "undefined") {
    return;
  }
  writeStorageItem(STORAGE_KEYS.readingScrollPositions, JSON.stringify(map));
}

function positionKey(storyId: string, episodeId: string) {
  return `${storyId}:${episodeId}`;
}

export function loadReadingScrollPosition(
  storyId: string,
  episodeId: string
): ReadingScrollPosition | null {
  const entry = readMap()[positionKey(storyId, episodeId)];
  if (!entry || typeof entry.scrollPercent !== "number") {
    return null;
  }
  return entry;
}

export function saveReadingScrollPosition(input: {
  storyId: string;
  episodeId: string;
  scrollPercent: number;
}) {
  const map = readMap();
  const key = positionKey(input.storyId, input.episodeId);
  map[key] = {
    storyId: input.storyId,
    episodeId: input.episodeId,
    scrollPercent: Math.max(0, Math.min(100, input.scrollPercent)),
    lastReadAt: new Date().toISOString()
  };
  writeMap(map);
}

export function clearReadingScrollPosition(storyId: string, episodeId: string) {
  const map = readMap();
  delete map[positionKey(storyId, episodeId)];
  writeMap(map);
}
