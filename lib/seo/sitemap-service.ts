import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { seoSettings } from "@/lib/db/schema/seo-center";
import {
  SITEMAP_SEGMENT_IDS,
  type SitemapSegmentId
} from "@/lib/seo/sitemap-segments";
import { listSitemapChildDescriptors } from "@/lib/seo/sitemap-children";
import {
  buildSitemapSegmentEntries,
  buildAllPublicSitemapEntries
} from "@/lib/seo/sitemap-builders";
import { buildSitemapIndexXml as renderSitemapIndexXml } from "@/lib/seo/sitemap-xml";

export type SeoSitemapSettings = {
  sitemapEnabled: boolean;
  robotsEnabled: boolean;
  includeChapters: boolean;
  includeProfiles: boolean;
  includeMedia: boolean;
  includeArticles: boolean;
  includeTaxonomy: boolean;
  defaultChangefreq: MetadataRoute.Sitemap[number]["changeFrequency"] | null;
  defaultPriority: number | null;
};

const DEFAULT_SITEMAP_SETTINGS: SeoSitemapSettings = {
  sitemapEnabled: true,
  robotsEnabled: true,
  includeChapters: true,
  includeProfiles: true,
  includeMedia: true,
  includeArticles: true,
  includeTaxonomy: true,
  defaultChangefreq: null,
  defaultPriority: null
};

const VALID_CHANGEFREQ = new Set([
  "always",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "never"
]);

function parseChangefreq(
  value: string | null | undefined
): SeoSitemapSettings["defaultChangefreq"] {
  if (!value?.trim()) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return VALID_CHANGEFREQ.has(normalized)
    ? (normalized as SeoSitemapSettings["defaultChangefreq"])
    : null;
}

function parsePriority(value: string | null | undefined): number | null {
  if (value == null || value === "") {
    return null;
  }
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0 || num > 1) {
    return null;
  }
  return num;
}

export async function getSeoSitemapSettings(): Promise<SeoSitemapSettings> {
  try {
    const rows = await db.select().from(seoSettings).limit(1);
    const row = rows[0];
    if (!row) {
      return DEFAULT_SITEMAP_SETTINGS;
    }

    return {
      sitemapEnabled: row.sitemapEnabled,
      robotsEnabled: row.robotsEnabled,
      includeChapters: row.includeChapters ?? true,
      includeProfiles: row.includeProfiles ?? true,
      includeMedia: row.includeMedia ?? true,
      includeArticles: row.includeArticles ?? true,
      includeTaxonomy: row.includeTaxonomy ?? true,
      defaultChangefreq: parseChangefreq(row.defaultChangefreq),
      defaultPriority: parsePriority(row.defaultPriority)
    };
  } catch {
    return DEFAULT_SITEMAP_SETTINGS;
  }
}

export type SeoSitemapSettingsUpdateInput = {
  sitemapEnabled: boolean;
  robotsEnabled: boolean;
  includeChapters: boolean;
  includeProfiles: boolean;
  includeMedia: boolean;
  includeArticles: boolean;
  includeTaxonomy: boolean;
  defaultChangefreq?: string | null;
  defaultPriority?: string | null;
};

export async function updateSeoSitemapSettings(input: SeoSitemapSettingsUpdateInput) {
  const existing = await db.select().from(seoSettings).limit(1);
  const payload = {
    sitemapEnabled: input.sitemapEnabled,
    robotsEnabled: input.robotsEnabled,
    includeChapters: input.includeChapters,
    includeProfiles: input.includeProfiles,
    includeMedia: input.includeMedia,
    includeArticles: input.includeArticles,
    includeTaxonomy: input.includeTaxonomy,
    defaultChangefreq: input.defaultChangefreq?.trim() || null,
    defaultPriority: input.defaultPriority?.trim() || null,
    updatedAt: new Date()
  };

  if (!existing[0]) {
    throw new Error("seo_settings row missing — run SEO migration/seed first.");
  }

  const [row] = await db
    .update(seoSettings)
    .set(payload)
    .where(eq(seoSettings.id, existing[0].id))
    .returning();
  return row;
}

export async function isSitemapPublishingEnabled(
  settings: SeoSitemapSettings
): Promise<boolean> {
  if (!settings.sitemapEnabled) {
    return false;
  }
  const { isSearchEngineIndexingBlocked } = await import(
    "@/lib/settings/get-site-launch-settings"
  );
  return !(await isSearchEngineIndexingBlocked());
}

export function getEnabledSitemapSegmentIds(
  settings: SeoSitemapSettings
): SitemapSegmentId[] {
  if (!settings.sitemapEnabled) {
    return [];
  }

  const enabled: SitemapSegmentId[] = ["static", "stories"];

  if (settings.includeChapters) {
    enabled.push("chapters");
  }
  if (settings.includeTaxonomy) {
    enabled.push("taxonomy");
  }
  if (settings.includeProfiles) {
    enabled.push("authors");
  }
  if (settings.includeArticles) {
    enabled.push("posts", "policies", "reels");
  }
  if (settings.includeMedia) {
    enabled.push("media");
  }

  return enabled.filter((id) => SITEMAP_SEGMENT_IDS.includes(id));
}

export async function buildEnabledSitemapSegmentEntries(
  segmentId: SitemapSegmentId,
  settings?: SeoSitemapSettings
): Promise<MetadataRoute.Sitemap> {
  const resolved = settings ?? (await getSeoSitemapSettings());
  const enabled = getEnabledSitemapSegmentIds(resolved);
  if (!enabled.includes(segmentId)) {
    return [];
  }
  return buildSitemapSegmentEntries(segmentId, resolved);
}

export async function getSitemapIndexEntries(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSeoSitemapSettings();
  if (!settings.sitemapEnabled) {
    return [];
  }

  const children = await listSitemapChildDescriptors(settings);
  return children
    .map((child) => {
      if (!child.url) {
        return null;
      }
      return { url: child.url };
    })
    .filter((entry): entry is { url: string } => entry != null);
}

/** Root index at `/sitemap.xml`. */
export async function buildSitemapIndexXml(): Promise<string> {
  const settings = await getSeoSitemapSettings();
  if (!settings.sitemapEnabled) {
    return renderSitemapIndexXml([]);
  }

  const children = await listSitemapChildDescriptors(settings);
  const locs = children
    .map((child) =>
      child.url
        ? {
            loc: child.url,
            lastModified: new Date()
          }
        : null
    )
    .filter((item): item is { loc: string; lastModified: Date } => item != null);

  return renderSitemapIndexXml(locs);
}

export { buildAllPublicSitemapEntries };