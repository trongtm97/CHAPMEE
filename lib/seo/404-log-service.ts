import { createHash } from "node:crypto";
import { and, count, desc, eq, ilike, type SQL } from "drizzle-orm";
import { isNextBuildPhase } from "@/lib/build/is-build-time";
import { db } from "@/lib/db";
import { seo404Logs } from "@/lib/db/schema/seo-center";
import { normalizeSeoPath } from "@/lib/seo/seo-validation";

const DEDUPE_MS = 60_000;
const recentPathLogs = new Map<string, number>();

const BOT_UA_PATTERNS = [
  /bot/i,
  /crawl/i,
  /spider/i,
  /slurp/i,
  /curl\//i,
  /wget/i,
  /python-requests/i,
  /headless/i
];

const SPAM_PATH_PREFIXES = [
  "/wp-",
  "/.env",
  "/xmlrpc",
  "/phpmyadmin",
  "/.git",
  "/admin.php",
  "/vendor/phpunit"
];

export type LogSeo404Input = {
  path: string;
  referrer?: string | null;
  userAgent?: string | null;
};

export type ListSeo404LogsParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

function shouldSkip404Log(path: string, userAgent?: string | null): boolean {
  const normalized = normalizeSeoPath(path);

  if (SPAM_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return true;
  }

  if (userAgent && BOT_UA_PATTERNS.some((pattern) => pattern.test(userAgent))) {
    return true;
  }

  const now = Date.now();
  const last = recentPathLogs.get(normalized);
  if (last && now - last < DEDUPE_MS) {
    return true;
  }
  recentPathLogs.set(normalized, now);

  return false;
}

export async function logSeo404Hit(input: LogSeo404Input): Promise<void> {
  try {
    if (isNextBuildPhase()) {
      return;
    }

    const path = normalizeSeoPath(input.path.split("?")[0]?.split("#")[0] ?? "/");

    if (path.startsWith("/api/") || path.startsWith("/_next/")) {
      return;
    }

    if (shouldSkip404Log(path, input.userAgent)) {
      return;
    }

    const referrer = input.referrer?.trim().slice(0, 512) || null;
    const userAgentHash = input.userAgent?.trim()
      ? hashValue(input.userAgent.trim().slice(0, 256))
      : null;

    const existing = await db
      .select()
      .from(seo404Logs)
      .where(eq(seo404Logs.path, path))
      .limit(1);

    const row = existing[0];
    const now = new Date();

    if (row) {
      await db
        .update(seo404Logs)
        .set({
          hitCount: row.hitCount + 1,
          lastSeenAt: now,
          referrer: referrer ?? row.referrer,
          userAgentHash: userAgentHash ?? row.userAgentHash
        })
        .where(eq(seo404Logs.id, row.id));
      return;
    }

    await db.insert(seo404Logs).values({
      path,
      referrer,
      userAgentHash,
      hitCount: 1,
      firstSeenAt: now,
      lastSeenAt: now
    });
  } catch {
    return;
  }
}

function build404ListFilters(params: ListSeo404LogsParams): SQL | undefined {
  const search = params.search?.trim();
  if (!search) {
    return undefined;
  }
  const pattern = `%${search.replace(/[%_]/g, "")}%`;
  return ilike(seo404Logs.path, pattern);
}

export async function listSeo404Logs(params: ListSeo404LogsParams = {}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, params.pageSize ?? 25));
  const offset = (page - 1) * pageSize;
  const where = build404ListFilters(params);

  const [items, totalResult] = await Promise.all([
    db
      .select()
      .from(seo404Logs)
      .where(where)
      .orderBy(desc(seo404Logs.hitCount), desc(seo404Logs.lastSeenAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ total: count() }).from(seo404Logs).where(where)
  ]);

  const total = Number(totalResult[0]?.total ?? 0);
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  };
}

export async function getSeo404LogByPath(path: string) {
  const normalized = normalizeSeoPath(path);
  const rows = await db.select().from(seo404Logs).where(eq(seo404Logs.path, normalized)).limit(1);
  return rows[0] ?? null;
}
