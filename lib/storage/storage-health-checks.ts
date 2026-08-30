/** Maps storage:health check names → drizzle migration file hints. */
export const STORAGE_HEALTH_MIGRATION_HINTS: Record<string, string> = {
  "episodes.content_object_key": "drizzle/0008_episode_content_object_storage.sql",
  "episodes.plain_text_preview": "drizzle/0008_episode_content_object_storage.sql",
  "episodes.content_hash": "drizzle/0008_episode_content_object_storage.sql",
  "import_jobs.raw_object_key": "drizzle/0009_import_jobs_pipeline.sql",
  "import_items.parsed_content_object_key": "drizzle/0009_import_jobs_pipeline.sql",
  "rpc.search_public_episode_ids": "drizzle/0010_episodes_search_vector.sql",
  "rpc.search_public_story_ids":
    "db/migrations/legacy/179_stories_search_vector.sql (db:legacy) or stories.search_vector"
};

export function formatStorageHealthFailure(checks: Array<{
  name: string;
  ok: boolean;
  detail?: string;
}>) {
  const failed = checks.filter((c) => !c.ok);
  if (failed.length === 0) {
    return null;
  }

  const lines = failed.map((c) => {
    const hint = STORAGE_HEALTH_MIGRATION_HINTS[c.name];
    return hint ? `  - ${c.name} → apply ${hint}` : `  - ${c.name}: ${c.detail ?? "missing"}`;
  });

  return `Storage schema incomplete:\n${lines.join("\n")}\n\nRun: npm run db:migrate\nThen: npm run storage:health`;
}
