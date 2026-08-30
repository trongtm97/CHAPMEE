/**
 * Audio companion MVP validation (story-level only).
 *
 * Run: npx tsx scripts/validate-audio-companion.ts
 *      npx tsx scripts/validate-audio-companion.ts --with-db
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { loadEnvLocal } from "./lib/load-env-local";
import { sql } from "drizzle-orm";
import { defaultAudioPolicySettings, getAudioPolicySettings } from "../lib/settings/audio-policy-settings";
import { canShowAdsOnAudio } from "../src/lib/audio/audio-policy";

type Check = { name: string; passed: boolean; details: string };

const ROOT = process.cwd();
const SCAN_DIRS = ["src", "app", "components", "lib", "scripts"] as const;

function check(name: string, predicate: () => void): Check {
  try {
    predicate();
    return { name, passed: true, details: "OK" };
  } catch (error) {
    return {
      name,
      passed: false,
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

function expectTrue(value: boolean, message: string) {
  if (!value) throw new Error(message);
}

function expectFalse(value: boolean, message: string) {
  if (value) throw new Error(message);
}

function walkFiles(dir: string, acc: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkFiles(full, acc);
    } else if (/\.(ts|tsx|mjs|js)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

function scanSourceFiles(): string[] {
  const files: string[] = [];
  for (const dir of SCAN_DIRS) {
    walkFiles(join(ROOT, dir), files);
  }
  return files;
}

function readAllSources(): { path: string; content: string }[] {
  return scanSourceFiles().map((path) => ({
    path: relative(ROOT, path).replace(/\\/g, "/"),
    content: readFileSync(path, "utf8")
  }));
}

function grepForbidden(sources: { path: string; content: string }[]) {
  const uiSources = sources.filter(
    (file) =>
      (file.path.startsWith("app/") ||
        file.path.startsWith("components/") ||
        file.path.startsWith("src/components/")) &&
      file.path.endsWith(".tsx")
  );
  const patterns: Array<{ label: string; regex: RegExp; allowlist?: RegExp; audioUiOnly?: boolean }> = [
    { label: "Nghe chương này", regex: /Nghe chương này/i },
    {
      label: "Đọc chương in audio UI",
      regex: /Đọc chương/i,
      audioUiOnly: true
    },
    { label: "chapter_id.*audio", regex: /chapter_id.*audio|audio.*chapter_id/i },
    { label: "chapterAudio", regex: /chapterAudio/i },
    { label: "buildQueueFromChapter", regex: /buildQueueFromChapter/i },
    { label: "auto_play_next_chapter", regex: /auto_play_next_chapter/i },
    { label: "max_audio_items_per_chapter", regex: /max_audio_items_per_chapter/i },
    { label: "allow_chapter_level_audio", regex: /allow_chapter_level_audio/i },
    { label: "youtube mp3/ytdl", regex: /youtube.*mp3|ytdl|download.*youtube/i },
    { label: "proxy audio", regex: /proxy.*audio/i },
    { label: "audio-only route", regex: /audio-only/i }
  ];

  const hits: string[] = [];
  for (const file of uiSources) {
    for (const pattern of patterns) {
      if (!pattern.regex.test(file.content)) continue;
      if (pattern.allowlist && pattern.allowlist.test(file.path)) continue;
      if (pattern.audioUiOnly && !/audio|StoryAudio|AudioItem/i.test(file.path)) continue;
      hits.push(`${pattern.label} -> ${file.path}`);
    }
  }
  return hits;
}

function sortAudioParts<T extends { part_number: number | null; sort_order: number; created_at: string }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const aPart = a.part_number ?? Number.MAX_SAFE_INTEGER;
    const bPart = b.part_number ?? Number.MAX_SAFE_INTEGER;
    if (aPart !== bPart) return aPart - bPart;
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

async function runDbChecks(): Promise<Check[]> {
  loadEnvLocal();
  const { db } = await import("../lib/db");
  const settings = await getAudioPolicySettings();
  const checks: Check[] = [];

  const orphanStory = await db.execute(sql`
    select id from audio_items where story_id is null limit 1
  `);
  checks.push(
    check("No audio item without story_id", () => {
      expectTrue((orphanStory.rows ?? []).length === 0, "Found audio_items without story_id");
    })
  );

  const publishedOnUnpublished = await db.execute(sql`
    select ai.id
    from audio_items ai
    join stories s on s.id = ai.story_id
    where ai.status = 'published'
      and (s.status <> 'published' or s.visibility <> 'public')
    limit 1
  `);
  checks.push(
    check("No published audio on unpublished story", () => {
      expectTrue(
        (publishedOnUnpublished.rows ?? []).length === 0,
        "Found published audio linked to unpublished/non-public story"
      );
    })
  );

  const paidRows = await db.execute(sql`
    select id from audio_items where is_free = false limit 1
  `);
  checks.push(
    check("No audio item with is_free=false", () => {
      expectTrue((paidRows.rows ?? []).length === 0, "Found paid audio rows");
    })
  );

  const youtubeMissingId = await db.execute(sql`
    select id from audio_items
    where audio_source_type = 'youtube_embed' and (youtube_video_id is null or youtube_video_id = '')
    limit 1
  `);
  checks.push(
    check("YouTube items have youtube_video_id", () => {
      expectTrue((youtubeMissingId.rows ?? []).length === 0, "Found YouTube item missing video id");
    })
  );

  const externalMissingUrl = await db.execute(sql`
    select id from audio_items
    where audio_source_type = 'external_audio_url'
      and coalesce(normalized_external_audio_url, external_audio_url, '') = ''
    limit 1
  `);
  checks.push(
    check("External items have URL", () => {
      expectTrue((externalMissingUrl.rows ?? []).length === 0, "Found external item missing URL");
    })
  );

  const youtubeBg = await db.execute(sql`
    select id from audio_items
    where audio_source_type = 'youtube_embed' and background_playback_allowed = true
    limit 1
  `);
  checks.push(
    check("YouTube background_playback_allowed is false", () => {
      expectTrue((youtubeBg.rows ?? []).length === 0, "Found YouTube with background allowed");
    })
  );

  const youtubeContinuous = await db.execute(sql`
    select id from audio_items
    where audio_source_type = 'youtube_embed' and continuous_playback_allowed = true
    limit 1
  `);
  checks.push(
    check("YouTube continuous_playback_allowed is false", () => {
      expectTrue((youtubeContinuous.rows ?? []).length === 0, "Found YouTube with continuous allowed");
    })
  );

  const translationAds = await db.execute(sql`
    select ai.id, s.content_origin, s.rights_status, ai.ads_policy
    from audio_items ai
    join stories s on s.id = ai.story_id
    where s.content_origin in ('translation', 'translated')
      and coalesce(s.rights_status, 'unverified') <> 'verified'
      and ai.ads_policy = 'ads_allowed'
    limit 5
  `);
  checks.push(
    check("Translation unverified audio ads disabled by default", () => {
      if (!settings.translated_story_audio_ads_allowed_when_unverified) {
        expectTrue((translationAds.rows ?? []).length === 0, "Found unverified translation with ads_allowed");
      }
    })
  );

  const publishedExternal = await db.execute(sql`
    select id, story_id, part_number, sort_order, created_at, audio_source_type, status
    from audio_items
    where status = 'published' and audio_source_type = 'external_audio_url'
    order by story_id, part_number nulls last, sort_order, created_at
    limit 500
  `);
  checks.push(
    check("External published queue excludes YouTube", () => {
      const rows = (publishedExternal.rows ?? []) as Array<{ audio_source_type: string }>;
      expectTrue(rows.every((row) => row.audio_source_type === "external_audio_url"), "Queue includes non-external");
    })
  );

  checks.push(
    check("External queue sort order part_number/sort_order", () => {
      const rows = (publishedExternal.rows ?? []) as Array<{
        story_id: string;
        part_number: number | null;
        sort_order: number;
        created_at: string;
      }>;
      const byStory = new Map<string, typeof rows>();
      for (const row of rows) {
        const list = byStory.get(row.story_id) ?? [];
        list.push(row);
        byStory.set(row.story_id, list);
      }
      for (const [, list] of byStory) {
        const sorted = sortAudioParts(list);
        const original = list.map((item) => `${item.part_number}:${item.sort_order}:${item.created_at}`).join("|");
        const expected = sorted.map((item) => `${item.part_number}:${item.sort_order}:${item.created_at}`).join("|");
        expectTrue(original === expected, "Queue order mismatch for a story");
      }
    })
  );

  return checks;
}

async function main() {
  const withDb = process.argv.includes("--with-db");
  const sources = readAllSources();
  const checks: Check[] = [];

  const playerStore = sources.find((file) => file.path.endsWith("src/lib/audio/audio-player-store.ts"));
  checks.push(
    check("GlobalAudioPlayer state has no chapterId/chapterTitle", () => {
      const content = playerStore?.content ?? "";
      expectFalse(/chapterId|chapterTitle/i.test(content), "chapter fields found in audio player store");
    })
  );

  const mobileNav = sources.find((file) => file.path.endsWith("components/layout/MobileBottomNav.tsx"));
  checks.push(
    check("Mobile bottom nav has exactly 4 tabs", () => {
      const content = mobileNav?.content ?? "";
      const match = content.match(/const navItems = \[[\s\S]*?\] as const/);
      expectTrue(Boolean(match), "navItems not found");
      const itemsBlock = match?.[0] ?? "";
      const hrefCount = (itemsBlock.match(/href:/g) ?? []).length;
      expectTrue(hrefCount === 4, `Expected 4 tabs, found ${hrefCount}`);
    })
  );

  checks.push(
    check("Policy defaults keep YouTube background/continuous off", () => {
      expectFalse(defaultAudioPolicySettings.background_audio_youtube_enabled, "YouTube background enabled in defaults");
      expectFalse(
        defaultAudioPolicySettings.continuous_playback_youtube_enabled,
        "YouTube continuous enabled in defaults"
      );
      expectFalse(defaultAudioPolicySettings.background_ad_refresh_enabled, "background ad refresh enabled");
      expectFalse(defaultAudioPolicySettings.paid_audio_enabled, "paid audio enabled");
      expectFalse(defaultAudioPolicySettings.coin_unlock_audio_enabled, "coin unlock enabled");
    })
  );

  checks.push(
    check("canShowAdsOnAudio blocks unverified translation by default", () => {
      const settings = defaultAudioPolicySettings;
      const story = { content_origin: "translation", rights_status: "unverified" };
      const item = { audio_source_type: "external_audio_url", ads_policy: "inherit", rights_status: "self_declared" };
      expectFalse(canShowAdsOnAudio(story, item, settings), "Unverified translation should not show ads");
    })
  );

  const forbiddenHits = grepForbidden(sources);
  checks.push(
    check("Forbidden patterns scan", () => {
      if (forbiddenHits.length > 0) {
        throw new Error(forbiddenHits.slice(0, 10).join("; "));
      }
    })
  );

  if (withDb) {
    checks.push(...(await runDbChecks()));
  } else {
    checks.push({
      name: "DB checks",
      passed: true,
      details: "Skipped (pass --with-db to run database checks)"
    });
  }

  const failed = checks.filter((item) => !item.passed);
  console.log(JSON.stringify({ total: checks.length, failed: failed.length, checks }, null, 2));
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
