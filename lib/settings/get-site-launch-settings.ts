import { unstable_cache } from "next/cache";
import { isNextBuildPhase } from "@/lib/build/is-build-time";
import {
  defaultSiteLaunchSettings,
  loadSiteLaunchSettingsRow,
  SITE_LAUNCH_CACHE_TAG,
  type SiteLaunchSettings
} from "@/lib/settings/site-launch-settings";

const getCachedSiteLaunchSettings = unstable_cache(
  loadSiteLaunchSettingsRow,
  ["site-launch-settings"],
  { tags: [SITE_LAUNCH_CACHE_TAG], revalidate: 30 }
);

export async function getSiteLaunchSettings(options?: {
  useCache?: boolean;
}): Promise<SiteLaunchSettings> {
  if (isNextBuildPhase()) {
    return defaultSiteLaunchSettings;
  }

  if (options?.useCache === false) {
    return loadSiteLaunchSettingsRow();
  }
  return getCachedSiteLaunchSettings();
}

export async function isSearchEngineIndexingBlocked(): Promise<boolean> {
  const settings = await getSiteLaunchSettings();
  return settings.block_search_engines;
}
