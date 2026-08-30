import { z } from "zod";
import { fetchAppSettingByKey } from "@/lib/data/app-settings";

export const SITE_LAUNCH_SETTINGS_KEY = "site_launch_settings";
export const SITE_LAUNCH_CACHE_TAG = "site-launch-settings";

export const siteLaunchSettingsSchema = z.object({
  block_search_engines: z.boolean().default(false),
  coming_soon_enabled: z.boolean().default(false),
  coming_soon_title: z.string().min(1).max(200).default("ChapMee sắp ra mắt"),
  coming_soon_message: z
    .string()
    .min(1)
    .max(2000)
    .default(
      "Chúng tôi đang hoàn thiện nền tảng. Hãy quay lại sau — hoặc đăng nhập nếu bạn là đội vận hành."
    ),
  show_login_link: z.boolean().default(true)
});

export type SiteLaunchSettings = z.infer<typeof siteLaunchSettingsSchema>;

export const defaultSiteLaunchSettings: SiteLaunchSettings =
  siteLaunchSettingsSchema.parse({});

export function parseSiteLaunchSettings(raw: unknown): SiteLaunchSettings {
  const parsed = siteLaunchSettingsSchema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }
  return defaultSiteLaunchSettings;
}

export async function loadSiteLaunchSettingsRow(): Promise<SiteLaunchSettings> {
  const row = await fetchAppSettingByKey(SITE_LAUNCH_SETTINGS_KEY);
  if (!row) {
    return defaultSiteLaunchSettings;
  }
  return parseSiteLaunchSettings(row.value);
}
