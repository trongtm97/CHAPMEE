import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";

function yesterdayDate() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function rollupFairDistributionDaily(date = yesterdayDate()) {
  const supabase = createAdminClient();
  const since = `${date}T00:00:00.000Z`;
  const until = `${date}T23:59:59.999Z`;

  const { data: exposures, error } = await supabase
    .from("exposure_events")
    .select("surface, author_user_id, story_id")
    .gte("created_at", since)
    .lte("created_at", until)
    .limit(50000);

  if (error) {
    if (isMissingSchemaError(error)) return { ok: false, error: error.message };
    throw error;
  }

  const authorBySurface = new Map<string, number>();
  const storyIds = new Set<string>();
  const storyImpressions = new Map<string, number>();

  for (const row of exposures ?? []) {
    const surface = String(row.surface ?? "other");
    const authorId = row.author_user_id ? String(row.author_user_id) : null;
    if (authorId) {
      const key = `${surface}:${authorId}`;
      authorBySurface.set(key, (authorBySurface.get(key) ?? 0) + 1);
      authorBySurface.set(`all:${authorId}`, (authorBySurface.get(`all:${authorId}`) ?? 0) + 1);
    }
    if (row.story_id) {
      const sid = String(row.story_id);
      storyIds.add(sid);
      storyImpressions.set(sid, (storyImpressions.get(sid) ?? 0) + 1);
    }
  }

  const authorRows = [...authorBySurface.entries()].map(([key, impressions]) => {
    const [surface, authorId] = key.split(":");
    return { date, author_id: authorId, surface, impressions, clicks: 0 };
  });

  if (authorRows.length > 0) {
    await supabase.from("author_exposure_daily").upsert(authorRows, {
      onConflict: "date,author_id,surface"
    });
  }

  if (storyIds.size === 0) {
    return { ok: true, authorRows: authorRows.length, taxonomyRows: 0 };
  }

  const { data: links } = await supabase
    .from("story_taxonomy_terms")
    .select("story_id, term_id")
    .in("story_id", [...storyIds])
    .eq("type", "main_genre");

  const storyToTerms = new Map<string, string[]>();
  for (const link of links ?? []) {
    const storyId = String(link.story_id);
    const termId = String(link.term_id);
    storyToTerms.set(storyId, [...(storyToTerms.get(storyId) ?? []), termId]);
  }

  const termBySurface = new Map<string, number>();

  for (const row of exposures ?? []) {
    if (!row.story_id) continue;
    const storyId = String(row.story_id);
    const surface = String(row.surface ?? "other");
    const terms = storyToTerms.get(storyId) ?? [];
    for (const termId of terms) {
      const key = `${surface}:${termId}`;
      termBySurface.set(key, (termBySurface.get(key) ?? 0) + 1);
      const allKey = `all:${termId}`;
      termBySurface.set(allKey, (termBySurface.get(allKey) ?? 0) + 1);
    }
  }

  const taxonomyRows = [...termBySurface.entries()].map(([key, impressions]) => {
    const [surface, termId] = key.split(":");
    return { date, term_id: termId, surface, impressions, clicks: 0, ctr: 0 };
  });

  if (taxonomyRows.length > 0) {
    await supabase.from("taxonomy_exposure_daily").upsert(taxonomyRows, {
      onConflict: "date,term_id,surface"
    });
  }

  return {
    ok: true,
    authorRows: authorRows.length,
    taxonomyRows: taxonomyRows.length
  };
}
