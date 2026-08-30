import "server-only";

import { resolveCacheBackend } from "@/lib/cache/cache";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  getRecentIntegrityRuns,
  type IntegrityRunRow
} from "@/lib/storage/integrity-runs";

export type StorageArchiveOverview = {
  chapterContentObjects: number;
  chapterContentBytes: number;
  episodesInlineDbOnly: number;
  importJobsTotal: number;
  importJobsFailed: number;
  importItemsTotal: number;
  importItemsPublished: number;
  episodesMissingKeyWhileS3: number;
  cacheBackend: string;
  redisConfigured: boolean;
  lastCheckHint: string;
  lastIntegrityRuns: IntegrityRunRow[];
};

export async function getStorageArchiveOverview(): Promise<StorageArchiveOverview> {
  const [chapterStats, importStats, importItemStats, orphanDb, inlineDb, lastIntegrityRuns] =
    await Promise.all([
    db.execute(sql`
      select
        count(*)::int as cnt,
        coalesce(sum(content_size_bytes), 0)::bigint as bytes
      from public.episodes
      where content_object_key is not null
        and trim(content_object_key) <> ''
    `).catch(() => ({ rows: [{ cnt: 0, bytes: 0 }] })),
    db.execute(sql`
      select
        count(*)::int as total,
        count(*) filter (where status = 'failed')::int as failed
      from public.import_jobs
    `).catch(() => ({ rows: [{ total: 0, failed: 0 }] })),
    db.execute(sql`
      select
        count(*)::int as total,
        count(*) filter (where status = 'published')::int as published
      from public.import_items
    `).catch(() => ({ rows: [{ total: 0, published: 0 }] })),
    db.execute(sql`
      select count(*)::int as cnt
      from public.episodes
      where content_storage_type = 's3'
        and (content_object_key is null or trim(content_object_key) = '')
    `).catch(() => ({ rows: [{ cnt: 0 }] })),
    db.execute(sql`
      select count(*)::int as cnt
      from public.episodes
      where coalesce(content_storage_type, 'db') = 'db'
        and (content is not null and length(trim(content)) > 32)
    `),
    getRecentIntegrityRuns()
  ]);

  let importItemsTotal = 0;
  let importItemsPublished = 0;
  try {
    const itemRow = importItemStats.rows[0] as {
      total?: number;
      published?: number;
    };
    importItemsTotal = Number(itemRow?.total ?? 0);
    importItemsPublished = Number(itemRow?.published ?? 0);
  } catch {
    /* import_items table may not exist yet */
  }

  const chapterRow = chapterStats.rows[0] as { cnt?: number; bytes?: string | number };
  const importRow = importStats.rows[0] as { total?: number; failed?: number };
  const orphanRow = orphanDb.rows[0] as { cnt?: number };
  const inlineRow = inlineDb.rows[0] as { cnt?: number };

  return {
    chapterContentObjects: Number(chapterRow?.cnt ?? 0),
    chapterContentBytes: Number(chapterRow?.bytes ?? 0),
    episodesInlineDbOnly: Number(inlineRow?.cnt ?? 0),
    importJobsTotal: Number(importRow?.total ?? 0),
    importJobsFailed: Number(importRow?.failed ?? 0),
    importItemsTotal,
    importItemsPublished,
    episodesMissingKeyWhileS3: Number(orphanRow?.cnt ?? 0),
    cacheBackend: resolveCacheBackend(),
    redisConfigured: Boolean(process.env.REDIS_URL?.trim()),
    lastCheckHint:
      "npm run storage:scheduled-dry-run · storage:check-all · db:migrate:status",
    lastIntegrityRuns
  };
}
