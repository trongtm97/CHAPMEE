import { z } from "zod";
import { fetchAppSettingByKey } from "@/lib/data/app-settings";

export const FILM_ADAPTATION_POLICY_SETTINGS_KEY = "film_adaptation_policy_settings";

const filmStatusSchema = z.enum([
  "draft",
  "pending_review",
  "published",
  "hidden",
  "rejected",
  "copyright_disputed",
  "unavailable"
]);

const settingsSchema = z.object({
  film_adaptations_enabled: z.boolean().default(true),
  film_adaptations_youtube_only: z.boolean().default(true),
  require_linked_story: z.boolean().default(true),
  allow_story_level_only: z.boolean().default(true),
  allow_chapter_level_linking: z.boolean().default(false),
  allow_youtube_video: z.boolean().default(true),
  allow_youtube_playlist: z.boolean().default(true),
  film_must_be_free: z.boolean().default(true),
  paid_film_enabled: z.boolean().default(false),
  coin_unlock_film_enabled: z.boolean().default(false),
  film_tips_enabled: z.boolean().default(false),
  film_ads_enabled: z.boolean().default(true),

  default_film_status: z
    .enum(["draft", "pending_review", "published", "hidden"])
    .default("pending_review"),
  auto_publish_for_trusted_creators: z.boolean().default(false),
  require_rights_declaration: z.boolean().default(true),

  show_in_discover_tab: z.boolean().default(true),
  discover_tab_label: z.string().min(1).max(120).default("Phim chuyển thể"),
  show_on_story_detail: z.boolean().default(true),
  show_creative_disclaimer: z.boolean().default(true),
  creative_disclaimer_text: z
    .string()
    .min(1)
    .max(2000)
    .default(
      "Phim/video có thể chuyển thể sáng tạo và không nhất thiết giống từng chi tiết của bản truyện."
    ),

  original_story_film_ads_allowed: z.boolean().default(true),
  translated_story_film_ads_requires_verified_rights: z.boolean().default(true),
  translated_story_film_ads_allowed_when_unverified: z.boolean().default(false),
  youtube_embed_ads_on_film_pages_enabled: z.boolean().default(false),

  max_films_per_story: z.number().int().positive().max(1000).default(20),
  require_admin_review_for_youtube: z.boolean().default(false),
  broken_youtube_check_enabled: z.boolean().default(true),
  broken_youtube_check_interval_hours: z.number().int().positive().max(168).default(24),
  hide_unavailable_films_automatically: z.boolean().default(false)
});

export type FilmAdaptationPolicySettings = z.infer<typeof settingsSchema>;

/** All row statuses (includes moderation terminal states). */
export type FilmAdaptationRowStatus = z.infer<typeof filmStatusSchema>;

export const defaultFilmAdaptationPolicySettings: FilmAdaptationPolicySettings =
  settingsSchema.parse({});

export function parseFilmAdaptationPolicySettings(
  raw: unknown
): FilmAdaptationPolicySettings {
  const parsed = settingsSchema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }
  return defaultFilmAdaptationPolicySettings;
}

export async function getFilmAdaptationPolicySettings(): Promise<FilmAdaptationPolicySettings> {
  const row = await fetchAppSettingByKey(FILM_ADAPTATION_POLICY_SETTINGS_KEY);
  if (!row) {
    return defaultFilmAdaptationPolicySettings;
  }
  return parseFilmAdaptationPolicySettings(row.value);
}
