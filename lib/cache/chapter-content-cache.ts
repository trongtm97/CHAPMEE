import type { ChapterContentEnvelopeV1 } from "@/lib/content/chapter-content-types";
import { chapterContentCacheTtlMs } from "@/lib/cache/cache";

const MAX_MEMORY_ENTRIES = 200;
const DEFAULT_TTL_MS = chapterContentCacheTtlMs();

type CacheEntry = {
  envelope: ChapterContentEnvelopeV1;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheEntry>();

type RedisClientLike = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, options?: { PX?: number }) => Promise<unknown>;
  keys: (pattern: string) => Promise<string[]>;
  del: (keys: string[]) => Promise<unknown>;
  connect: () => Promise<void>;
  on: (event: string, listener: () => void) => void;
};

let redisClient: RedisClientLike | null = null;
let redisConnectAttempted = false;

function cacheKey(chapterId: string, contentHash: string) {
  return `chapter-content:${chapterId}:${contentHash}`;
}

function memoryGet(key: string): ChapterContentEnvelopeV1 | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return entry.envelope;
}

function memorySet(key: string, envelope: ChapterContentEnvelopeV1, ttlMs: number) {
  if (memoryCache.size >= MAX_MEMORY_ENTRIES) {
    const oldest = memoryCache.keys().next().value;
    if (oldest) memoryCache.delete(oldest);
  }
  memoryCache.set(key, { envelope, expiresAt: Date.now() + ttlMs });
}

async function getRedisClient(): Promise<RedisClientLike | null> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;

  if (redisConnectAttempted && !redisClient) {
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  redisConnectAttempted = true;

  try {
    const { createClient } = await import("redis");
    const client = createClient({ url });
    client.on("error", () => {
      /* swallow — fallback to memory/S3 */
    });
    await client.connect();
    redisClient = client as unknown as RedisClientLike;
    return redisClient;
  } catch (error) {
    console.warn("[chapter-content-cache] Redis unavailable, using memory", {
      error: error instanceof Error ? error.message : error
    });
    redisClient = null;
    return null;
  }
}

async function redisGet(key: string): Promise<ChapterContentEnvelopeV1 | null> {
  try {
    const client = await getRedisClient();
    if (!client) return null;
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as ChapterContentEnvelopeV1;
  } catch {
    return null;
  }
}

async function redisSet(key: string, envelope: ChapterContentEnvelopeV1, ttlMs: number) {
  try {
    const client = await getRedisClient();
    if (!client) return;
    await client.set(key, JSON.stringify(envelope), { PX: ttlMs });
  } catch {
    /* ignore */
  }
}

/** Get cached chapter envelope (Redis → memory). Never throws. */
export async function getCachedChapterContent(
  chapterId: string,
  contentHash: string
): Promise<ChapterContentEnvelopeV1 | null> {
  const key = cacheKey(chapterId, contentHash);
  const fromRedis = await redisGet(key);
  if (fromRedis) {
    memorySet(key, fromRedis, DEFAULT_TTL_MS);
    return fromRedis;
  }
  return memoryGet(key);
}

/** Sync getter for hot path when already in memory (used after async warm). */
export function getCachedChapterEnvelope(
  chapterId: string,
  contentHash: string
): ChapterContentEnvelopeV1 | null {
  return memoryGet(cacheKey(chapterId, contentHash));
}

export async function setCachedChapterContent(
  chapterId: string,
  contentHash: string,
  envelope: ChapterContentEnvelopeV1,
  ttlMs = DEFAULT_TTL_MS
) {
  const key = cacheKey(chapterId, contentHash);
  memorySet(key, envelope, ttlMs);
  await redisSet(key, envelope, ttlMs);
}

export function setCachedChapterEnvelope(
  chapterId: string,
  contentHash: string,
  envelope: ChapterContentEnvelopeV1,
  ttlMs = DEFAULT_TTL_MS
) {
  memorySet(cacheKey(chapterId, contentHash), envelope, ttlMs);
  void redisSet(cacheKey(chapterId, contentHash), envelope, ttlMs);
}

export function clearChapterContentCache(chapterId: string) {
  const prefix = `chapter-content:${chapterId}:`;
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
  void (async () => {
    try {
      const client = await getRedisClient();
      if (!client) return;
      const keys = await client.keys(`${prefix}*`);
      if (keys.length > 0) {
        await client.del(keys);
      }
    } catch {
      /* ignore */
    }
  })();
}
