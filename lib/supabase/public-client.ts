import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClientOptions } from "@/lib/supabase/client-options";
import { getSupabaseEnv } from "@/lib/supabase/env";

/** Client anon không đọc cookies — dùng cho truy vấn public trong `unstable_cache()`. */
export function createPublicClient() {
  const { anonKey, url } = getSupabaseEnv();
  return createSupabaseClient(url, anonKey, getSupabaseClientOptions());
}
