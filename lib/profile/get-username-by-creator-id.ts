import { createClient } from "@/lib/supabase/server";

/** Resolve public username from legacy creator_profiles.id (server-only). */
export async function getUsernameByCreatorProfileId(
  creatorProfileId: string | null | undefined
): Promise<string | null> {
  if (!creatorProfileId) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("creator_profiles")
    .select("profiles!inner(username)")
    .eq("id", creatorProfileId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
  const username = (profile?.username as string | null)?.trim().toLowerCase();
  return username || null;
}
