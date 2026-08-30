/**
 * Dry-run audio link checks (default). Use --apply to persist status updates.
 *
 * Run:
 *   npx tsx scripts/check-audio-links.ts
 *   npx tsx scripts/check-audio-links.ts --apply
 */
import { sql } from "drizzle-orm";
import { loadEnvLocal } from "./lib/load-env-local";
import { db } from "../lib/db";
import { summarizeAudioLinkChecks, type AudioLinkCheckInputRow } from "../src/lib/audio/audio-link-checker";

loadEnvLocal();

async function main() {
  const apply = process.argv.includes("--apply");
  const dryRun = !apply;
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const storyArg = process.argv.find((arg) => arg.startsWith("--story-id="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : 200;
  const storyId = storyArg ? storyArg.split("=")[1] : undefined;
  const safeLimit = Number.isFinite(limit) ? Math.min(500, Math.max(1, limit)) : 200;

  const result = storyId
    ? await db.execute(sql`
        select id, story_id, title, audio_source_type, status,
               external_audio_url, normalized_external_audio_url,
               youtube_url, youtube_video_id
        from audio_items
        where story_id = ${storyId}
        order by updated_at desc
        limit ${safeLimit}
      `)
    : await db.execute(sql`
        select id, story_id, title, audio_source_type, status,
               external_audio_url, normalized_external_audio_url,
               youtube_url, youtube_video_id
        from audio_items
        order by updated_at desc
        limit ${safeLimit}
      `);

  const rows = (result.rows ?? []) as AudioLinkCheckInputRow[];
  const summary = await summarizeAudioLinkChecks(rows);

  if (apply) {
    for (const row of summary.rows) {
      if (row.outcome === "skipped" || row.outcome === "unknown") continue;
      const source = rows.find((item) => item.id === row.audioItemId);
      const nextStatus =
        row.outcome === "failed" && source?.status === "published" ? "broken" : source?.status;
      await db.execute(sql`
        update audio_items
        set
          last_checked_at = now(),
          last_check_status = ${row.outcome === "ok" ? "ok" : "failed"},
          last_check_error = ${row.error},
          updated_at = now(),
          status = coalesce(${nextStatus}, status)
        where id = ${row.audioItemId}
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
