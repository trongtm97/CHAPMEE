import { createClient } from "@/lib/supabase/server";

export async function getPublicCreatorIdByUsername(username: string) {
  const normalized = username.trim().toLowerCase();
  if (!normalized) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("creator_profiles")
    .select("id, profiles!inner(username)")
    .eq("status", "active")
    .eq("profiles.username", normalized)
    .maybeSingle();

  if (error || !data) return null;
  return String((data as { id: string }).id);
}
