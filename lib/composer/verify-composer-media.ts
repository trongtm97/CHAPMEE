import { collectMediaIdsFromComposer } from "@/lib/composer/collect-media-ids";
import { isComposerStructuredDocument } from "@/lib/composer/serializer";
import { getChapterImagesMap } from "@/lib/images/get-chapter-images-map";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function resolveKnownComposerMediaIds(
  supabase: SupabaseClient,
  structuredContent: unknown | null,
  storyId: string
): Promise<Set<string>> {
  if (!structuredContent || !isComposerStructuredDocument(structuredContent)) {
    return new Set();
  }

  const ids = collectMediaIdsFromComposer(structuredContent);
  if (ids.length === 0) {
    return new Set();
  }

  const map = await getChapterImagesMap(supabase, ids);
  const known = new Set(Object.keys(map));

  if (known.size === ids.length) {
    return known;
  }

  const { data: rows } = await supabase
    .from("chapter_images")
    .select("id")
    .in("id", ids)
    .eq("story_id", storyId);

  for (const row of rows ?? []) {
    known.add(String(row.id));
  }

  return known;
}
