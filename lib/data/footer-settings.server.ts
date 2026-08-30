import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";
import {
  FOOTER_CONFIG_CACHE_TAG,
  FOOTER_CONFIG_KEY,
  parseFooterConfig,
  type FooterConfig
} from "@/lib/settings/footer-config";
import { createClient } from "@/lib/data/server";

export async function upsertFooterConfig(
  config: FooterConfig,
  updatedBy: string | null
) {
  const validated = parseFooterConfig(config);
  const db = await createClient();
  const now = new Date().toISOString();

  const { error } = await db.from("app_settings").upsert(
    {
      key: FOOTER_CONFIG_KEY,
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

  revalidateTag(FOOTER_CONFIG_CACHE_TAG, "max");
  revalidatePath("/admin/settings/footer");

  return { error: null, success: true as const, updatedAt: now };
}
