import { createClient } from "@/lib/supabase/server";

export async function getPublicUserIdByUsername(username: string) {
  const normalized = username.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", normalized)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return String(data.id);
}

export async function getPublicCreatorIdByUsername(username: string) {
  const userId = await getPublicUserIdByUsername(username);
  if (!userId) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("creator_profiles")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return String(data.id);
}
