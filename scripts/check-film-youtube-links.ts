/**
 * Dry-run YouTube film link checks (default). Use --apply to persist status updates.
 *
 * Run:
 *   npx tsx scripts/check-film-youtube-links.ts
 *   npx tsx scripts/check-film-youtube-links.ts --apply
 */
import { sql } from "drizzle-orm";
import { loadEnvLocal } from "./lib/load-env-local";
import { db } from "../lib/db";
import {
  summarizeFilmYoutubeChecks,
  type FilmYoutubeCheckInputRow
} from "../src/lib/film-adaptations/youtube-checker";
import { getFilmAdaptationPolicySettings } from "../lib/settings/film-adaptation-settings";

loadEnvLocal();

async function main() {
  const apply = process.argv.includes("--apply");
  const dryRun = !apply;
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const storyArg = process.argv.find((arg) => arg.startsWith("--story-id="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : 200;
  const storyId = storyArg ? storyArg.split("=")[1] : undefined;
  const safeLimit = Number.isFinite(limit) ? Math.min(500, Math.max(1, limit)) : 200;

  const settings = await getFilmAdaptationPolicySettings();
  if (!settings.broken_youtube_check_enabled && !apply) {
    console.warn("[check-film-youtube-links] broken_youtube_check_enabled is false in policy");
  }

  const result = storyId
    ? await db.execute(sql`
        select id, story_id, title, status, youtube_url, youtube_video_id, youtube_playlist_id, youtube_embed_type
        from story_film_adaptations
        where story_id = ${storyId}
        order by updated_at desc
        limit ${safeLimit}
      `)
    : await db.execute(sql`
        select id, story_id, title, status, youtube_url, youtube_video_id, youtube_playlist_id, youtube_embed_type
        from story_film_adaptations
        order by updated_at desc
        limit ${safeLimit}
      `);

  const rows = (result.rows ?? []) as FilmYoutubeCheckInputRow[];
  const summary = await summarizeFilmYoutubeChecks(rows);

  if (apply) {
    for (const row of summary.rows) {
      if (row.outcome === "skipped" || row.outcome === "unknown") continue;
      const source = rows.find((item) => item.id === row.filmId);
      const nextStatus =
        row.outcome === "failed" &&
        settings.hide_unavailable_films_automatically &&
        source?.status === "published"
          ? "unavailable"
          : source?.status;
      await db.execute(sql`
        update story_film_adaptations
        set
          last_checked_at = now(),
          last_check_status = ${row.outcome === "ok" ? "ok" : "failed"},
          last_check_error = ${row.error},
          updated_at = now(),
          status = coalesce(${nextStatus}, status)
        where id = ${row.filmId}
      `);
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: dryRun ? "dry-run" : "apply",
        checked: summary.checked,
        ok: summary.ok,
        failed: summary.failed,
        unknown: summary.unknown,
        skipped: summary.skipped,
        errors: summary.errors,
        sample: summary.rows.slice(0, 20)
      },
      null,
      2
    )
  );

  if (summary.failed > 0 || summary.errors > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
