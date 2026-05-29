"use server";

import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";

export async function syncProfileVerificationCache(userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("sync_profile_verification_cache", {
    p_user_id: userId
  });

  if (error && !isMissingSchemaError(error)) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[verification] sync cache:", error.message);
    }
    return { ok: false, error: error.message };
  }

  return { ok: true, error: null };
}
