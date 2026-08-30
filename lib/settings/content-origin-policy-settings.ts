import { z } from "zod";
import { fetchAppSettingByKey } from "@/lib/data/app-settings";

export const CONTENT_ORIGIN_POLICY_SETTINGS_KEY = "content_origin_policy_settings";

const settingsSchema = z.object({
  translation_paid_chapters_allowed: z.boolean().default(false),
  translation_story_bundle_allowed: z.boolean().default(false),
  translation_coin_unlock_allowed: z.boolean().default(false),
  translation_ads_requires_verified_rights: z.boolean().default(true),
  translation_tips_requires_verified_rights: z.boolean().default(true),
  translation_boost_requires_verified_rights: z.boolean().default(false),
  original_full_monetization_enabled: z.boolean().default(true),
  default_translation_rights_status: z.enum(["pending_review", "unverified"]).default("pending_review"),
  default_translation_monetization_policy: z
    .enum(["free_only", "no_monetization"])
    .default("free_only")
});

export type ContentOriginPolicySettings = z.infer<typeof settingsSchema>;

export const defaultContentOriginPolicySettings: ContentOriginPolicySettings =
  settingsSchema.parse({});

export function parseContentOriginPolicySettings(
  raw: unknown
): ContentOriginPolicySettings {
  const parsed = settingsSchema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }
  return defaultContentOriginPolicySettings;
}

export async function getContentOriginPolicySettings(): Promise<ContentOriginPolicySettings> {
  const row = await fetchAppSettingByKey(CONTENT_ORIGIN_POLICY_SETTINGS_KEY);
  if (!row) {
    return defaultContentOriginPolicySettings;
  }
  return parseContentOriginPolicySettings(row.value);
}

