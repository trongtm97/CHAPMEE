import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { seoRedirects, seoSettings } from "@/lib/db/schema/seo-center";
import { interpolateSeoTemplate } from "@/lib/seo/seo-template";
import { normalizeSeoPath } from "@/lib/seo/seo-validation";
import {
  SEO_DEFAULT_DESCRIPTION_TEMPLATE,
  SEO_DEFAULT_SITE_NAME,
  SEO_DEFAULT_TITLE_TEMPLATE
} from "@/lib/seo/seo-constants";
import type { SeoMetadataInput, SeoMetadataResult, SeoSettingsRow } from "@/lib/seo/seo-types";
import { validateSeoRedirectInput } from "@/lib/seo/seo-validation";

export const DEFAULT_SEO_SETTINGS_FALLBACK: Omit<
  SeoSettingsRow,
  "id" | "createdAt" | "updatedAt" | "defaultOgImageAssetId"
> & { defaultOgImageAssetId: null } = {
  siteName: SEO_DEFAULT_SITE_NAME,
  defaultTitleTemplate: SEO_DEFAULT_TITLE_TEMPLATE,
  defaultDescriptionTemplate: SEO_DEFAULT_DESCRIPTION_TEMPLATE,
  defaultOgImageAssetId: null,
  titleSeparator: "|",
  defaultRobotsIndex: true,
  defaultRobotsFollow: true,
  defaultLocale: "vi",
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

/** Load global SEO settings. Falls back to in-memory defaults when DB empty/unavailable. */
export async function getSeoSettings(): Promise<SeoSettingsRow | typeof DEFAULT_SEO_SETTINGS_FALLBACK> {
  try {
    const rows = await db.select().from(seoSettings).limit(1);
    if (rows[0]) {
      return rows[0];
    }
  } catch {
    // DB may be unavailable during build — use defaults.
  }

  return DEFAULT_SEO_SETTINGS_FALLBACK;
}

export function applyTitleTemplate(
  template: string,
  vars: Record<string, string | null | undefined>
): string {
  return interpolateSeoTemplate(template, vars);
}

/**
 * MVP metadata merge: settings + input only.
 * Override lookup is added in a later prompt when admin CRUD is wired.
 */
export function mergeSeoMetadata(
  settings: Pick<
    SeoSettingsRow | typeof DEFAULT_SEO_SETTINGS_FALLBACK,
    | "siteName"
    | "defaultTitleTemplate"
    | "defaultDescriptionTemplate"
    | "defaultRobotsIndex"
    | "defaultRobotsFollow"
    | "defaultOgImageAssetId"
  >,
  input: SeoMetadataInput
): SeoMetadataResult {
  const pageTitle = input.pageTitle?.trim() || settings.siteName;
  const title = applyTitleTemplate(settings.defaultTitleTemplate, {
    page_title: pageTitle,
    site_name: settings.siteName
  });

  const description =
    input.pageDescription?.trim() || settings.defaultDescriptionTemplate;

  const robotsIndex = input.indexableOverride ?? settings.defaultRobotsIndex;
  const robotsFollow = input.followOverride ?? settings.defaultRobotsFollow;

  return {
    title,
    description,
    canonicalUrl: input.canonicalUrl?.trim() || undefined,
    robotsIndex,
    robotsFollow,
    ogImageAssetId: input.ogImageAssetId ?? settings.defaultOgImageAssetId,
    twitterImageAssetId: input.twitterImageAssetId ?? input.ogImageAssetId ?? settings.defaultOgImageAssetId,
    sources: {
      settings: true,
      override: false,
      input: Boolean(input.pageTitle || input.pageDescription || input.canonicalUrl)
    }
  };
}

/** Lookup enabled redirect by normalized source path. */
export async function findEnabledSeoRedirect(sourcePath: string) {
  const normalized = normalizeSeoPath(sourcePath.split("?")[0]?.split("#")[0] ?? "/");
  const rows = await db
    .select()
    .from(seoRedirects)
    .where(and(eq(seoRedirects.sourcePath, normalized), eq(seoRedirects.isEnabled, true)))
    .limit(1);

  return rows[0] ?? null;
}

export function validateSeoRedirectForWrite(input: Parameters<typeof validateSeoRedirectInput>[0]) {
  return validateSeoRedirectInput(input);
}
