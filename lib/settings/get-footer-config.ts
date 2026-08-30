import { unstable_cache } from "next/cache";
import { isNextBuildPhase } from "@/lib/build/is-build-time";
import {
  defaultFooterConfig,
  FOOTER_CONFIG_CACHE_TAG,
  FOOTER_CONFIG_KEY,
  parseFooterConfig,
  type FooterConfig
} from "@/lib/settings/footer-config";
import { fetchAppSettingByKey } from "@/lib/data/app-settings";
import { resolveMediaAssetPublicUrl } from "@/lib/seo/seo-media";

export type FooterConfigResult = {
  config: FooterConfig;
  logoUrl: string | null;
  updatedAt: string | null;
};

async function resolveLogoUrl(logoMediaId: string | null): Promise<string | null> {
  if (!logoMediaId) return null;
  return resolveMediaAssetPublicUrl(logoMediaId);
}

async function loadFooterConfig(): Promise<FooterConfigResult> {
  const row = await fetchAppSettingByKey(FOOTER_CONFIG_KEY);

  if (!row) {
    return {
      config: defaultFooterConfig,
      logoUrl: null,
      updatedAt: null
    };
  }

  const config = parseFooterConfig(row.value);
  const logoUrl = await resolveLogoUrl(config.brand.logoMediaId);

  return {
    config,
    logoUrl,
    updatedAt: row.updated_at
  };
}

const getCachedFooterConfig = unstable_cache(
  loadFooterConfig,
  ["footer-config"],
  { tags: [FOOTER_CONFIG_CACHE_TAG], revalidate: 300 }
);

export async function getFooterConfig(options?: {
  useCache?: boolean;
}): Promise<FooterConfigResult> {
  if (isNextBuildPhase()) {
    return {
      config: defaultFooterConfig,
      logoUrl: null,
      updatedAt: null
    };
  }

  if (options?.useCache === false) {
    return loadFooterConfig();
  }
  return getCachedFooterConfig();
}
