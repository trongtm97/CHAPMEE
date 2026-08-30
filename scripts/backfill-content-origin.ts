import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { loadEnvLocal } from "./lib/load-env-local";

type StoryRow = {
  id: string;
  title: string | null;
  slug: string | null;
  content_origin: string | null;
  source_title: string | null;
  source_author_name: string | null;
  source_url: string | null;
  source_platform: string | null;
  translation_type: string | null;
  rights_status: string | null;
  monetization_policy: string | null;
};

type Counters = {
  updatedOriginal: number;
  updatedTranslation: number;
  skipped: number;
  errors: number;
};

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function normalize(text: string | null | undefined) {
  return (text ?? "").trim().toLowerCase();
}

function looksLikeTranslation(story: StoryRow) {
  const title = normalize(story.title);
  const slug = normalize(story.slug);
  const sourceSignals = [
    normalize(story.source_title),
    normalize(story.source_author_name),
    normalize(story.source_url),
    normalize(story.source_platform)
  ].join(" ");

  const translationHints = [
    "truyen dich",
    "truyện dịch",
    "[dịch]",
    "(dịch)",
    "translated",
    "translation",
    "fan trans",
    "chuyen ngu",
    "chuyển ngữ"
  ];

  if (translationHints.some((hint) => title.includes(hint) || slug.includes(hint))) {
    return true;
  }

  return sourceSignals.length > 0;
}

function buildUpdatePayload(story: StoryRow) {
  if (looksLikeTranslation(story)) {
    return {
      contentOrigin: "translation",
      translationType: story.translation_type ?? "fan_translation",
      rightsStatus: story.rights_status ?? "unverified",
      monetizationPolicy: story.monetization_policy ?? "free_only"
    } as const;
  }
  return {
    contentOrigin: "original",
    translationType: null,
    rightsStatus: story.rights_status ?? "verified",
    monetizationPolicy: story.monetization_policy ?? "full"
  } as const;
}

async function main() {
  loadEnvLocal();

  const apply = hasFlag("--apply");
  const dryRun = !apply || hasFlag("--dry-run");
  const counters: Counters = {
    updatedOriginal: 0,
    updatedTranslation: 0,
    skipped: 0,
    errors: 0
  };

  const { rows } = await db.execute(sql`
    select
      id,
      title,
      slug,
      content_origin,
      source_title,
      source_author_name,
      source_url,
      source_platform,
      translation_type,
      rights_status,
      monetization_policy
    from public.stories
    where content_origin is null or trim(content_origin) = ''
    order by created_at asc
    limit 20000
  `);

  const stories = rows as StoryRow[];
  console.log(
    `[backfill-content-origin] Mode: ${dryRun ? "DRY-RUN" : "APPLY"} | Candidates: ${stories.length}`
  );

  for (const story of stories) {
    try {
      const update = buildUpdatePayload(story);

      if (!dryRun) {
        await db.execute(sql`
          update public.stories
          set
            content_origin = ${update.contentOrigin},
            translation_type = ${update.translationType},
            rights_status = ${update.rightsStatus},
            monetization_policy = ${update.monetizationPolicy},
            updated_at = now()
          where id = ${story.id}::uuid
            and (content_origin is null or trim(content_origin) = '')
        `);
      }

      if (update.contentOrigin === "translation") counters.updatedTranslation += 1;
      else counters.updatedOriginal += 1;
    } catch (error) {
      counters.errors += 1;
      console.error(
        `[backfill-content-origin] Failed for story=${story.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  counters.skipped = Math.max(
    0,
    stories.length -
      counters.updatedOriginal -
      counters.updatedTranslation -
      counters.errors
  );

  console.log("\n[backfill-content-origin] Summary");
  console.log(`- updated original: ${counters.updatedOriginal}`);
  console.log(`- updated translation: ${counters.updatedTranslation}`);
  console.log(`- skipped: ${counters.skipped}`);
  console.log(`- errors: ${counters.errors}`);
  console.log(
    dryRun
      ? "\nNo changes were written. Re-run with --apply to persist."
      : "\nChanges applied."
  );
}

main().catch((error) => {
  console.error(
    `[backfill-content-origin] Fatal: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(1);
});
