import type { SupabaseClient } from "@supabase/supabase-js";

/** Map stories.age_rating column value to taxonomy age_rating term id. */
export async function resolveAgeRatingTermId(
  supabase: SupabaseClient,
  ageRating: string
): Promise<string | null> {
  const { data } = await supabase
    .from("taxonomy_terms")
    .select("id")
    .eq("type", "age_rating")
    .eq("slug", ageRating)
    .eq("is_active", true)
    .maybeSingle();

  return data?.id ? String(data.id) : null;
}
