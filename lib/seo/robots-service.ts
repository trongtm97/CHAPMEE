import type { MetadataRoute } from "next";
import { isSearchEngineIndexingBlocked } from "@/lib/settings/get-site-launch-settings";
import { buildRobotsConfig } from "@/lib/seo/robots-config";
import { getSeoSitemapSettings } from "@/lib/seo/sitemap-service";

export async function buildRobotsConfigFromSettings(): Promise<MetadataRoute.Robots> {
  const [settings, blockSearchEngines] = await Promise.all([
    getSeoSitemapSettings(),
    isSearchEngineIndexingBlocked()
  ]);

  if (!settings.robotsEnabled || blockSearchEngines) {
    return {
      rules: [
        {
          userAgent: "*",
          disallow: ["/"]
        }
      ]
    };
  }

  const config = buildRobotsConfig();

  if (!settings.sitemapEnabled) {
    return {
      ...config,
      sitemap: undefined
    };
  }

  return config;
}
