/**
 * Film adaptations MVP validation.
 *
 * Run: npx tsx scripts/validate-film-adaptations.ts
 *      npx tsx scripts/validate-film-adaptations.ts --with-db
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { loadEnvLocal } from "./lib/load-env-local";
import { sql } from "drizzle-orm";
import {
  defaultFilmAdaptationPolicySettings,
  getFilmAdaptationPolicySettings
} from "../lib/settings/film-adaptation-settings";
import { canShowAdsOnFilmAdaptation } from "../src/lib/film-adaptations/film-policy";

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

function isFilmScopePath(path: string) {
  return (
    path.includes("/film-adaptations") ||
    path.includes("/films/") ||
    path.includes("components/films/") ||
    path.includes("studio/films") ||
    path.includes("admin/film-adaptations")
  );
}

function grepForbidden(sources: { path: string; content: string }[]) {
  const patterns: Array<{ label: string; regex: RegExp }> = [
    { label: "youtube mp3/ytdl/download", regex: /youtube.*mp3|ytdl|download.*youtube/i },
    { label: "proxy youtube", regex: /proxy.*youtube/i },
    { label: "rehost youtube", regex: /rehost.*youtube/i },
    {
      label: "background youtube playback",
      regex: /background_(audio_)?youtube|youtube.*background_playback|background_playback.*youtube/i
    },
    {
      label: "film autoplay flag",
      regex: /autoplay.*film|film.*autoplay|autoplay_film/i
    },
    {
      label: "chapter-level film DB column",
      regex: /chapter_id\s*:\s*uuid|chapterId\s*:\s*uuid/
    },
    {
      label: "standalone /films/[id] route",
      regex: /app\/films\/\[|['"`]\/films\/\[id\]/
    }
  ];

  const hits: string[] = [];
  for (const file of sources.filter((item) => isFilmScopePath(item.path))) {
    for (const pattern of patterns) {
      if (!pattern.regex.test(file.content)) continue;
      if (/FORBIDDEN|Không hỗ trợ|nên giữ false|MVP chỉ/i.test(file.content) && pattern.label.includes("background")) {
        continue;
      }
      if (pattern.label.includes("audio-only") && /FORBIDDEN|Không hỗ trợ/i.test(file.content)) {
        continue;
      }
      hits.push(`${pattern.label} -> ${file.path}`);
    }
  }
  return hits;
}

async function runDbChecks(): Promise<Check[]> {
  loadEnvLocal();
  const { db } = await import("../lib/db");
  const settings = await getFilmAdaptationPolicySettings();
  const checks: Check[] = [];

  const orphanStory = await db.execute(sql`
    select id from story_film_adaptations where story_id is null limit 1
  `);
  checks.push(
    check("No film without story_id", () => {
      expectTrue((orphanStory.rows ?? []).length === 0, "Found film rows without story_id");
    })
  );

  const publishedOnUnpublished = await db.execute(sql`
    select f.id
    from story_film_adaptations f
    join stories s on s.id = f.story_id
    where f.status = 'published'
      and (s.status <> 'published' or s.visibility <> 'public')
    limit 1
  `);
  checks.push(
    check("No published film on unpublished story", () => {
      expectTrue(
        (publishedOnUnpublished.rows ?? []).length === 0,
        "Found published film on unpublished/non-public story"
      );
    })
  );

  const paidRows = await db.execute(sql`
    select id from story_film_adaptations where is_free = false limit 1
  `);
  checks.push(
    check("No film with is_free=false", () => {
      expectTrue((paidRows.rows ?? []).length === 0, "Found paid film rows");
    })
  );

  const missingYoutubeId = await db.execute(sql`
    select id from story_film_adaptations
    where (youtube_embed_type = 'video' and coalesce(youtube_video_id, '') = '')
       or (youtube_embed_type = 'playlist' and coalesce(youtube_playlist_id, '') = '')
    limit 1
  `);
  checks.push(
    check("YouTube items have video_id or playlist_id", () => {
      expectTrue((missingYoutubeId.rows ?? []).length === 0, "Found YouTube film missing ids");
    })
  );

  const translationAds = await db.execute(sql`
    select f.id
    from story_film_adaptations f
    join stories s on s.id = f.story_id
    where s.content_origin in ('translation', 'translated')
      and coalesce(f.rights_status, s.rights_status, 'self_declared') <> 'verified'
      and f.ads_policy = 'ads_allowed'
    limit 5
  `);
  checks.push(
    check("Translation unverified film ads disabled by default", () => {
      if (!settings.translated_story_film_ads_allowed_when_unverified) {
        expectTrue((translationAds.rows ?? []).length === 0, "Found unverified translation film with ads_allowed");
      }
    })
  );

  return checks;
}

async function main() {
  const withDb = process.argv.includes("--with-db");
  const sources = readAllSources();
  const checks: Check[] = [];

  checks.push(
    check("Policy defaults: paid/coin off, chapter linking off, embed ads off", () => {
      expectFalse(defaultFilmAdaptationPolicySettings.paid_film_enabled, "paid_film_enabled");
      expectFalse(defaultFilmAdaptationPolicySettings.coin_unlock_film_enabled, "coin_unlock");
      expectFalse(defaultFilmAdaptationPolicySettings.allow_chapter_level_linking, "chapter linking");
      expectFalse(
        defaultFilmAdaptationPolicySettings.youtube_embed_ads_on_film_pages_enabled,
        "youtube embed ads default should be false"
      );
    })
  );

  checks.push(
    check("canShowAdsOnFilmAdaptation blocks unverified translation by default", () => {
      const settings = defaultFilmAdaptationPolicySettings;
      const story = { content_origin: "translation", rights_status: "self_declared" };
      const film = { ads_policy: "inherit", rights_status: "self_declared" };
      expectFalse(canShowAdsOnFilmAdaptation(story, film, settings), "Unverified translation should not show ads");
    })
  );

  const discoverCard = sources.find((f) => f.path.endsWith("components/films/FilmAdaptationCard.tsx"));
  checks.push(
    check("Discover film cards include Đọc truyện CTA", () => {
      expectTrue(
        /readCtaLabel\s*=\s*["']Đọc truyện["']/.test(discoverCard?.content ?? ""),
        "Default read CTA must be Đọc truyện"
      );
      expectTrue(/film\.storyHref/.test(discoverCard?.content ?? ""), "Story href link required");
    })
  );

  const storySection = sources.find((f) => f.path.endsWith("components/films/StoryFilmAdaptationsSection.tsx"));
  checks.push(
    check("Story film section returns null when empty", () => {
      expectTrue(/if \(items\.length === 0\) return null/.test(storySection?.content ?? ""), "Empty guard");
    })
  );

  const discoverFeed = sources.find((f) => f.path.endsWith("components/discover/DiscoverFeed.tsx"));
  checks.push(
    check("Discover films tab does not mass-render iframes", () => {
      const filmsBlock = discoverFeed?.content.match(/showFilmsTab[\s\S]{0,1200}/)?.[0] ?? "";
      expectFalse(/<iframe/i.test(filmsBlock), "Discover films tab must not contain iframe");
    })
  );

  const mobileNav = sources.find((f) => f.path.endsWith("components/layout/MobileBottomNav.tsx"));
  checks.push(
    check("Mobile bottom nav has exactly 4 tabs", () => {
      const content = mobileNav?.content ?? "";
      const match = content.match(/const navItems = \[[\s\S]*?\] as const/);
      expectTrue(Boolean(match), "navItems not found");
      const hrefCount = (match?.[0].match(/href:/g) ?? []).length;
      expectTrue(hrefCount === 4, `Expected 4 tabs, found ${hrefCount}`);
    })
  );

  const schemaFilm = sources.find((f) => f.path.endsWith("lib/db/schema/film-adaptations.ts"));
  checks.push(
    check("Schema has no chapter_id column on story_film_adaptations", () => {
      const content = schemaFilm?.content ?? "";
      expectFalse(/chapter_id\s*:/.test(content), "chapter_id column must not exist in film schema");
      expectFalse(/chapterId\s*:/.test(content), "chapterId column must not exist in film schema");
    })
  );

  const forbiddenHits = grepForbidden(sources);
  checks.push(
    check("Forbidden patterns scan", () => {
      if (forbiddenHits.length > 0) {
        throw new Error(forbiddenHits.slice(0, 15).join("; "));
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
