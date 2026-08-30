"use server";

import { createClient } from "@/lib/data/server";
import { isMissingSchemaError } from "@/lib/data/schema-errors";

export async function syncProfileVerificationCache(userId: string) {
  const db = await createClient();
  const { error } = await db.rpc("sync_profile_verification_cache", {
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
