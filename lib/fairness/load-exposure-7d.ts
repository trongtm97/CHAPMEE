import { windowStartIso } from "@/lib/fairness/exposure-share";
import type { Exposure7dContext } from "@/types/fairness";
import type { SupabaseClient } from "@supabase/supabase-js";

export function emptyExposure7dContext(): Exposure7dContext {
  return {
    totalImpressions: 0,
    authorImpressions: new Map(),
    storyImpressions: new Map(),
    authorSharePercent: new Map(),
    storySharePercent: new Map()
  };
}

export async function loadExposure7dContext(
  supabase: SupabaseClient,
  surface: string
): Promise<Exposure7dContext> {
  const since = windowStartIso("7d");

  const { data, error } = await supabase
    .from("exposure_events")
    .select("author_user_id, story_id")
    .eq("surface", surface)
    .gte("created_at", since)
    .limit(50000);

  if (error || !data?.length) {
    return emptyExposure7dContext();
  }

  const authorImpressions = new Map<string, number>();
  const storyImpressions = new Map<string, number>();

  for (const row of data) {
    if (row.author_user_id) {
      authorImpressions.set(
        row.author_user_id as string,
        (authorImpressions.get(row.author_user_id as string) ?? 0) + 1
      );
    }
    if (row.story_id) {
      storyImpressions.set(
        row.story_id as string,
        (storyImpressions.get(row.story_id as string) ?? 0) + 1
      );
    }
  }

  const totalImpressions = data.length;
  const authorSharePercent = new Map<string, number>();
  const storySharePercent = new Map<string, number>();

  for (const [authorId, count] of authorImpressions) {
    authorSharePercent.set(authorId, (count / totalImpressions) * 100);
  }
  for (const [storyId, count] of storyImpressions) {
    storySharePercent.set(storyId, (count / totalImpressions) * 100);
  }

  return {
    totalImpressions,
    authorImpressions,
    storyImpressions,
    authorSharePercent,
    storySharePercent
  };
}
