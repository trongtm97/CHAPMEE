import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";
import {
  CONTACT_SETTINGS_CACHE_TAG,
  CONTACT_SETTINGS_KEY
} from "@/lib/settings/default-contact-settings";
import { toContactSettingsDb } from "@/lib/settings/contact-settings-mapper";
import { createClient } from "@/lib/data/server";
import type { ContactSettings } from "@/types/contact-settings";

export async function upsertContactSettings(
  settings: ContactSettings,
  updatedBy: string | null
) {
  const db = await createClient();
  const now = new Date().toISOString();
  const value = toContactSettingsDb(settings);

  const { error } = await db.from("app_settings").upsert(
    {
      key: CONTACT_SETTINGS_KEY,
      value,
      is_public: true,
      updated_by: updatedBy,
      updated_at: now
    },
    { onConflict: "key" }
  );

  if (error) {
    return { error: error.message, success: false as const, updatedAt: null };
  }

  revalidateTag(CONTACT_SETTINGS_CACHE_TAG, "max");
  revalidatePath("/me");
  revalidatePath("/admin/settings/contact");

  return { error: null, success: true as const, updatedAt: now };
}
