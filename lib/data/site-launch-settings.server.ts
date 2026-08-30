import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/data/server";
import {
  parseSiteLaunchSettings,
  SITE_LAUNCH_CACHE_TAG,
  SITE_LAUNCH_SETTINGS_KEY,
  type SiteLaunchSettings
} from "@/lib/settings/site-launch-settings";

export async function upsertSiteLaunchSettings(
  settings: SiteLaunchSettings,
  updatedBy: string | null
) {
  const validated = parseSiteLaunchSettings(settings);
  const db = await createClient();
  const now = new Date().toISOString();

  const { error } = await db.from("app_settings").upsert(
    {
      key: SITE_LAUNCH_SETTINGS_KEY,
      value: validated,
      is_public: true,
      updated_by: updatedBy,
      updated_at: now
    },
    { onConflict: "key" }
  );

  if (error) {
    return { error: error.message, success: false as const, updatedAt: null };
  }

  revalidateTag(SITE_LAUNCH_CACHE_TAG, "max");
  revalidatePath("/");
  revalidatePath("/coming-soon");
  revalidatePath("/robots.txt");
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/settings/launch");

  return { error: null, success: true as const, updatedAt: now };
}
