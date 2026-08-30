import type { DatabaseClient } from "@/lib/db/types";

export async function searchPublicStoryIdsByFullText(
  db: DatabaseClient,
  query: string,
  limit = 60
): Promise<string[] | null> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const { data, error } = await db.rpc("search_public_story_ids", {
    search_query: trimmed,
    result_limit: limit
  });

  if (error) {
    if (error.code === "42883" || error.message.includes("search_public_story_ids")) {
      return null;
    }
    console.error("[search-public-stories] full-text rpc failed", error);
    return null;
  }

  const rows = Array.isArray(data) ? data : [];
  return rows.map((row: { story_id: string }) => String(row.story_id));
}
