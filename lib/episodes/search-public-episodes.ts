import type { DatabaseClient } from "@/lib/db/types";

/** DB-only full-text search on title/excerpt/plain_text_preview — never reads S3. */
export async function searchPublicEpisodeIdsByFullText(
  db: DatabaseClient,
  query: string,
  limit = 40
): Promise<string[] | null> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const { data, error } = await db.rpc("search_public_episode_ids", {
    search_query: trimmed,
    result_limit: limit
  });

  if (error) {
    if (error.code === "42883" || error.message.includes("search_public_episode_ids")) {
      return null;
    }
    console.warn("[search-public-episodes] full-text rpc failed", error.message);
    return null;
  }

  const rows = Array.isArray(data) ? data : [];
  return rows.map((row: { episode_id: string }) => String(row.episode_id));
}
