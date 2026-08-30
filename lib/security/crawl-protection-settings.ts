import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { isMissingSchemaError } from "@/lib/data/schema-errors";

export type CrawlProtectionSettings = {
  enabled: boolean;
  readerRateLimitEnabled: boolean;
  anonymousChapterReadsPerMinute: number;
  anonymousChapterReadsPerHour: number;
  loggedInChapterReadsPerMinute: number;
  loggedInChapterReadsPerHour: number;
  searchRequestsPerMinute: number;
  commentRequestsPerMinute: number;
  reactionRequestsPerMinute: number;
  reviewRequestsPerHour: number;
  challengeEnabled: boolean;
  challengeProvider: string | null;
  challengeThresholdJson: Record<string, unknown>;
  blockDatacenterMode: "off" | "monitor" | "challenge" | "block";
  goodBotAllowlist: string[];
};

const DEFAULTS: CrawlProtectionSettings = {
  enabled: true,
  readerRateLimitEnabled: true,
  anonymousChapterReadsPerMinute: 20,
  anonymousChapterReadsPerHour: 200,
  loggedInChapterReadsPerMinute: 60,
  loggedInChapterReadsPerHour: 600,
  searchRequestsPerMinute: 30,
  commentRequestsPerMinute: 10,
  reactionRequestsPerMinute: 30,
  reviewRequestsPerHour: 10,
  challengeEnabled: false,
  challengeProvider: null,
  challengeThresholdJson: { chapter_reads_per_minute: 15 },
  blockDatacenterMode: "monitor",
  goodBotAllowlist: ["Googlebot", "bingbot", "Applebot", "DuckDuckBot"]
};

function mapRow(row: Record<string, unknown>): CrawlProtectionSettings {
  const allowlist = row.good_bot_allowlist;
  return {
    enabled: Boolean(row.enabled),
    readerRateLimitEnabled: Boolean(row.reader_rate_limit_enabled),
    anonymousChapterReadsPerMinute: Number(row.anonymous_chapter_reads_per_minute),
    anonymousChapterReadsPerHour: Number(row.anonymous_chapter_reads_per_hour),
    loggedInChapterReadsPerMinute: Number(row.logged_in_chapter_reads_per_minute),
    loggedInChapterReadsPerHour: Number(row.logged_in_chapter_reads_per_hour),
    searchRequestsPerMinute: Number(row.search_requests_per_minute),
    commentRequestsPerMinute: Number(row.comment_requests_per_minute),
    reactionRequestsPerMinute: Number(row.reaction_requests_per_minute),
    reviewRequestsPerHour: Number(row.review_requests_per_hour),
    challengeEnabled: Boolean(row.challenge_enabled),
    challengeProvider: (row.challenge_provider as string | null) ?? null,
    challengeThresholdJson:
      (row.challenge_threshold_json as Record<string, unknown>) ?? {},
    blockDatacenterMode: (row.block_datacenter_mode as CrawlProtectionSettings["blockDatacenterMode"]) ?? "monitor",
    goodBotAllowlist: Array.isArray(allowlist)
      ? (allowlist as string[])
      : DEFAULTS.goodBotAllowlist
  };
}

export async function getCrawlProtectionSettings(): Promise<CrawlProtectionSettings> {
  try {
    const result = await db.execute(sql`
      select *
      from public.crawl_protection_settings
      where id = 'singleton'
      limit 1
    `);

    const row = result.rows[0];
    if (!row) {
      return DEFAULTS;
    }
    return mapRow(row as Record<string, unknown>);
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return DEFAULTS;
    }
    throw error;
  }
}

export async function updateCrawlProtectionSettings(
  patch: Partial<CrawlProtectionSettings>
) {
  const current = await getCrawlProtectionSettings();
  const next = { ...current, ...patch };

  await db.execute(sql`
    insert into public.crawl_protection_settings (
      id,
      enabled,
      reader_rate_limit_enabled,
      anonymous_chapter_reads_per_minute,
      anonymous_chapter_reads_per_hour,
      logged_in_chapter_reads_per_minute,
      logged_in_chapter_reads_per_hour,
      search_requests_per_minute,
      comment_requests_per_minute,
      reaction_requests_per_minute,
      review_requests_per_hour,
      challenge_enabled,
      challenge_provider,
      challenge_threshold_json,
      block_datacenter_mode,
      good_bot_allowlist,
      updated_at
    )
    values (
      'singleton',
      ${next.enabled},
      ${next.readerRateLimitEnabled},
      ${next.anonymousChapterReadsPerMinute},
      ${next.anonymousChapterReadsPerHour},
      ${next.loggedInChapterReadsPerMinute},
      ${next.loggedInChapterReadsPerHour},
      ${next.searchRequestsPerMinute},
      ${next.commentRequestsPerMinute},
      ${next.reactionRequestsPerMinute},
      ${next.reviewRequestsPerHour},
      ${next.challengeEnabled},
      ${next.challengeProvider},
      ${JSON.stringify(next.challengeThresholdJson)}::jsonb,
      ${next.blockDatacenterMode},
      ${JSON.stringify(next.goodBotAllowlist)}::jsonb,
      now()
    )
    on conflict (id) do update set
      enabled = excluded.enabled,
      reader_rate_limit_enabled = excluded.reader_rate_limit_enabled,
      anonymous_chapter_reads_per_minute = excluded.anonymous_chapter_reads_per_minute,
      anonymous_chapter_reads_per_hour = excluded.anonymous_chapter_reads_per_hour,
      logged_in_chapter_reads_per_minute = excluded.logged_in_chapter_reads_per_minute,
      logged_in_chapter_reads_per_hour = excluded.logged_in_chapter_reads_per_hour,
      search_requests_per_minute = excluded.search_requests_per_minute,
      comment_requests_per_minute = excluded.comment_requests_per_minute,
      reaction_requests_per_minute = excluded.reaction_requests_per_minute,
      review_requests_per_hour = excluded.review_requests_per_hour,
      challenge_enabled = excluded.challenge_enabled,
      challenge_provider = excluded.challenge_provider,
      challenge_threshold_json = excluded.challenge_threshold_json,
      block_datacenter_mode = excluded.block_datacenter_mode,
      good_bot_allowlist = excluded.good_bot_allowlist,
      updated_at = excluded.updated_at
  `);

  return next;
}
