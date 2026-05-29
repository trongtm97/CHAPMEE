import { unstable_cache } from "next/cache";
import { DEFAULT_CONTACT_SETTINGS } from "@/lib/settings/default-contact-settings";
import {
  parseContactSettingsDb,
  toContactSettings
} from "@/lib/settings/contact-settings-mapper";
import { fetchAppSettingByKey } from "@/lib/supabase/app-settings";
import {
  CONTACT_SETTINGS_CACHE_TAG,
  CONTACT_SETTINGS_KEY
} from "@/lib/settings/default-contact-settings";
import type { ContactSettings } from "@/types/contact-settings";

export { CONTACT_SETTINGS_CACHE_TAG };

export type ContactSettingsResult = {
  settings: ContactSettings;
  updatedAt: string | null;
};

async function loadContactSettings(): Promise<ContactSettingsResult> {
  const row = await fetchAppSettingByKey(CONTACT_SETTINGS_KEY);

  if (!row) {
    return {
      settings: DEFAULT_CONTACT_SETTINGS,
      updatedAt: null
    };
  }

  const db = parseContactSettingsDb(row.value);
  return {
    settings: toContactSettings(db),
    updatedAt: row.updated_at
  };
}

const getCachedContactSettings = unstable_cache(
  loadContactSettings,
  ["contact-settings"],
  { tags: [CONTACT_SETTINGS_CACHE_TAG], revalidate: 300 }
);

export async function getContactSettings(options?: {
  useCache?: boolean;
}): Promise<ContactSettingsResult> {
  if (options?.useCache === false) {
    return loadContactSettings();
  }
  return getCachedContactSettings();
}
