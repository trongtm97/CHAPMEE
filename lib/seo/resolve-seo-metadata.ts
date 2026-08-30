import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { seoOverrides, type SeoOverrideRow } from "@/lib/db/schema/seo-center";
import { buildCanonicalUrl, cleanText, trimDescription } from "@/lib/seo/metadata";
import { buildRobotsMeta, shouldNoIndexPath } from "@/lib/seo/noindex";
import { mergeExtraJsonLd } from "@/lib/seo/jsonld";
import { resolveSeoImageUrl, isSafeMetadataUrl } from "@/lib/seo/seo-media";
import { isSearchEngineIndexingBlocked } from "@/lib/settings/get-site-launch-settings";
import { DEFAULT_SEO_SETTINGS_FALLBACK, getSeoSettings } from "@/lib/seo/seo-service";
import {
  buildTemplateVariables,
  getSeoTemplateForPageType,
  interpolateSeoTemplate,
  warnSeoDescriptionLength,
  warnSeoTitleLength
} from "@/lib/seo/seo-template";
import type {
  ResolveSeoMetadataInput,
  ResolvedSeoMetadata,
  SeoEntityData
} from "@/lib/seo/seo-types";
import { SEO_DEFAULT_LOCALE } from "@/lib/seo/seo-constants";
import { normalizeSeoPath } from "@/lib/seo/seo-validation";
import type { SeoMetadataTemplate } from "@/types/admin-seo";

const NON_INDEXABLE_CONTENT_STATUSES = new Set([
  "draft",
  "hidden",
  "archived",
  "private",
  "rejected",
  "pending",
  "deleted"
]);

export type ResolveSeoMetadataOptions = {
  /** Skip DB lookups (tests / static generation with injected context). */
  preload?: {
    override?: SeoOverrideRow | null;
    template?: SeoMetadataTemplate | null;
    settings?: Awaited<ReturnType<typeof getSeoSettings>>;
  };
};

async function findSeoOverride(input: {
  path: string;
  locale: string;
  targetType?: ResolveSeoMetadataInput["targetType"];
  targetId?: string | null;
}): Promise<SeoOverrideRow | null> {
  const path = normalizeSeoPath(input.path);

  try {
    const byPath = await db
      .select()
      .from(seoOverrides)
      .where(
        and(
          eq(seoOverrides.isEnabled, true),
          eq(seoOverrides.locale, input.locale),
          eq(seoOverrides.path, path)
        )
      )
      .limit(1);

    if (byPath[0]) {
      return byPath[0];
    }

    if (input.targetId && input.targetType) {
      const byTarget = await db
        .select()
        .from(seoOverrides)
        .where(
          and(
            eq(seoOverrides.isEnabled, true),
            eq(seoOverrides.locale, input.locale),
            eq(seoOverrides.targetType, input.targetType),
            eq(seoOverrides.targetId, input.targetId)
          )
        )
        .limit(1);

      if (byTarget[0]) {
        return byTarget[0];
      }
    }
  } catch {
    return null;
  }

  return null;
}

function entityTitle(entity: SeoEntityData | null | undefined, fallback?: string | null) {
  return cleanText(
    fallback ||
      entity?.storyTitle ||
      entity?.chapterTitle ||
      entity?.postTitle ||
      entity?.taxonomyName ||
      entity?.pageTitle ||
      entity?.authorName
  );
}

function entityDescription(
  entity: SeoEntityData | null | undefined,
  fallback?: string | null
) {
  return cleanText(
    fallback || entity?.shortDescription || entity?.excerpt || entity?.postTitle
  );
}

function resolveCanonicalUrl(input: {
  path: string;
  isPrivate: boolean;
  overrideCanonical?: string | null;
  entityCanonicalPath?: string | null;
}): string | undefined {
  if (input.isPrivate) {
    return undefined;
  }

  const override = input.overrideCanonical?.trim();
  if (override) {
    if (override.startsWith("/")) {
      const abs = buildCanonicalUrl(normalizeSeoPath(override));
      return abs && isSafeMetadataUrl(abs) ? abs : undefined;
    }
    if (isSafeMetadataUrl(override)) {
      return override;
    }
    return undefined;
  }

  const entityPath = input.entityCanonicalPath?.trim();
  if (entityPath) {
    const abs = buildCanonicalUrl(normalizeSeoPath(entityPath));
    return abs && isSafeMetadataUrl(abs) ? abs : undefined;
  }

  const abs = buildCanonicalUrl(normalizeSeoPath(input.path));
  return abs && isSafeMetadataUrl(abs) ? abs : undefined;
}

function resolveRobots(input: {
  isPrivate: boolean;
  path: string;
  blockSearchEngines?: boolean;
  overrideIndex?: boolean | null;
  overrideFollow?: boolean | null;
  indexableOverride?: boolean | null;
  followOverride?: boolean | null;
  contentStatus?: string | null;
  templateRobots?: string | null;
  settingsIndex: boolean;
  settingsFollow: boolean;
}): ResolvedSeoMetadata["robots"] {
  if (input.blockSearchEngines) {
    return buildRobotsMeta({ indexable: false, followLinks: false });
  }

  if (input.isPrivate) {
    return buildRobotsMeta({ indexable: false, followLinks: false });
  }

  const contentStatus = input.contentStatus?.toLowerCase();
  if (contentStatus && NON_INDEXABLE_CONTENT_STATUSES.has(contentStatus)) {
    return buildRobotsMeta({ indexable: false, followLinks: true });
  }

  if (input.indexableOverride === false) {
    return buildRobotsMeta({
      indexable: false,
      followLinks: input.followOverride ?? true
    });
  }

  if (shouldNoIndexPath({ pathname: input.path })) {
    return buildRobotsMeta({
      indexable: false,
      followLinks: input.followOverride ?? true
    });
  }

  let indexable = input.settingsIndex;
  let follow = input.settingsFollow;

  if (input.templateRobots) {
    const directive = input.templateRobots.toLowerCase();
    if (directive.includes("noindex")) {
      indexable = false;
    }
    if (directive.includes("nofollow")) {
      follow = false;
    }
    if (directive.includes("index")) {
      indexable = true;
    }
    if (directive.includes("follow")) {
      follow = true;
    }
  }

  if (input.overrideIndex != null) {
    indexable = input.overrideIndex;
  }
  if (input.overrideFollow != null) {
    follow = input.overrideFollow;
  }
  if (input.indexableOverride === true) {
    indexable = true;
  }
  if (input.followOverride != null) {
    follow = input.followOverride;
  }

  return buildRobotsMeta({ indexable, followLinks: follow });
}

function pickOgImageAssetIds(
  override: SeoOverrideRow | null | undefined,
  entity: SeoEntityData | null | undefined,
  settingsDefaultId: string | null | undefined
) {
  const ogImageAssetId =
    override?.ogImageAssetId ??
    entity?.ogImageAssetId ??
    entity?.coverImageAssetId ??
    entity?.avatarImageAssetId ??
    settingsDefaultId ??
    null;

  const twitterImageAssetId =
    override?.twitterImageAssetId ??
    entity?.twitterImageAssetId ??
    ogImageAssetId;

  return { ogImageAssetId, twitterImageAssetId };
}

/**
 * Resolve SEO metadata for a public page.
 *
 * Priority: seo_overrides → entity data → page-type template → seo_settings defaults.
 */
export async function resolveSeoMetadata(
  input: ResolveSeoMetadataInput,
  options?: ResolveSeoMetadataOptions
): Promise<ResolvedSeoMetadata> {
  const locale = input.locale?.trim() || SEO_DEFAULT_LOCALE;
  const path = normalizeSeoPath(input.path);
  const entity = input.entityData ?? null;
  const warnings: string[] = [];
  const sources = {
    override: false,
    entity: false,
    template: false,
    settings: false
  };

  const [settings, override, template, blockSearchEngines] = await Promise.all([
    options?.preload?.settings ?? getSeoSettings(),
    options?.preload?.override !== undefined
      ? Promise.resolve(options.preload.override)
      : findSeoOverride({
          path,
          locale,
          targetType: input.targetType,
          targetId: input.targetId
        }),
    options?.preload?.template !== undefined
      ? Promise.resolve(options.preload.template)
      : getSeoTemplateForPageType(input.pageType),
    isSearchEngineIndexingBlocked()
  ]);

  const templateVars = buildTemplateVariables({
    siteName: settings.siteName,
    entity,
    fallbackTitle: input.fallbackTitle,
    fallbackDescription: input.fallbackDescription
  });

  const entityTitleValue = entityTitle(entity, input.fallbackTitle);
  const entityDescValue = entityDescription(entity, input.fallbackDescription);

  let title = "";
  let description = "";

  if (override?.title?.trim()) {
    title = override.title.trim();
    sources.override = true;
  } else if (entityTitleValue) {
    title = entityTitleValue;
    sources.entity = true;
  }

  if (override?.metaDescription?.trim()) {
    description = trimDescription(override.metaDescription.trim());
    sources.override = true;
  } else if (entityDescValue) {
    description = trimDescription(entityDescValue);
    sources.entity = true;
  }

  if (!title && template?.title_template) {
    title = interpolateSeoTemplate(template.title_template, templateVars);
    if (title) {
      sources.template = true;
    }
  }

  if (!description && template?.description_template) {
    description = interpolateSeoTemplate(template.description_template, templateVars);
    if (description) {
      sources.template = true;
    }
  }

  if (!title) {
    title = interpolateSeoTemplate(settings.defaultTitleTemplate, templateVars);
    sources.settings = true;
  }

  if (!description) {
    description = trimDescription(
      interpolateSeoTemplate(settings.defaultDescriptionTemplate, templateVars) ||
        settings.defaultDescriptionTemplate
    );
    sources.settings = true;
  }

  warnings.push(...warnSeoTitleLength(title), ...warnSeoDescriptionLength(description));

  const isPrivate = Boolean(input.isPrivatePage);

  const canonical = resolveCanonicalUrl({
    path,
    isPrivate,
    overrideCanonical: override?.canonicalUrl,
    entityCanonicalPath: entity?.canonicalPath
  });

  const robots = resolveRobots({
    isPrivate,
    path,
    blockSearchEngines,
    overrideIndex: override?.robotsIndex,
    overrideFollow: override?.robotsFollow,
    indexableOverride: input.indexableOverride,
    followOverride: input.followOverride,
    contentStatus: entity?.contentStatus ?? entity?.status,
    templateRobots: template?.robots_directive,
    settingsIndex: settings.defaultRobotsIndex,
    settingsFollow: settings.defaultRobotsFollow
  });

  const { ogImageAssetId, twitterImageAssetId } = pickOgImageAssetIds(
    override,
    entity,
    settings.defaultOgImageAssetId
  );

  const entityImageUrl = entity?.coverUrl ?? entity?.avatarUrl ?? null;

  const ogImageUrl = await resolveSeoImageUrl({
    assetId: ogImageAssetId,
    entityUrl: entityImageUrl,
    defaultAssetId: settings.defaultOgImageAssetId
  });

  const twitterImageUrl = await resolveSeoImageUrl({
    assetId: twitterImageAssetId,
    entityUrl: entityImageUrl,
    defaultAssetId: settings.defaultOgImageAssetId
  });

  const ogTitle =
    override?.ogTitle?.trim() ||
    title ||
    (template?.og_title_template
      ? interpolateSeoTemplate(template.og_title_template, templateVars)
      : "");

  const ogDescription =
    override?.ogDescription?.trim() ||
    description ||
    (template?.og_description_template
      ? interpolateSeoTemplate(template.og_description_template, templateVars)
      : "");

  const twitterTitle =
    override?.twitterTitle?.trim() ||
    ogTitle ||
    (template?.twitter_title_template
      ? interpolateSeoTemplate(template.twitter_title_template, templateVars)
      : "");

  const twitterDescription =
    override?.twitterDescription?.trim() ||
    ogDescription ||
    (template?.twitter_description_template
      ? interpolateSeoTemplate(template.twitter_description_template, templateVars)
      : "");

  const openGraphType =
    input.openGraphType ??
    (input.pageType === "profile"
      ? "profile"
      : input.pageType === "chapter" ||
          input.pageType === "story_detail" ||
          input.pageType === "article"
        ? "article"
        : "website");

  const jsonLd = mergeExtraJsonLd(
    input.jsonLd as Record<string, unknown> | null | undefined,
    (override?.extraJsonLd as Record<string, unknown> | unknown[] | null | undefined) ?? null
  );

  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    robots,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      type: openGraphType,
      ...(canonical ? { url: canonical } : {}),
      ...(ogImageUrl
        ? {
            images: [{ url: ogImageUrl, alt: ogTitle }]
          }
        : {})
    },
    twitter: {
      card: ogImageUrl || twitterImageUrl ? "summary_large_image" : "summary",
      title: twitterTitle,
      description: twitterDescription,
      ...(twitterImageUrl || ogImageUrl
        ? { images: [twitterImageUrl ?? ogImageUrl!] }
        : {})
    },
    jsonLd,
    keywords: entity?.keywords?.length ? entity.keywords : undefined,
    warnings,
    sources,
    ogImageAssetId,
    twitterImageAssetId
  };
}

/** Convenience: resolve + convert to Next.js Metadata in one call. */
export async function resolveNextMetadata(
  input: ResolveSeoMetadataInput,
  options?: ResolveSeoMetadataOptions
) {
  const { createNextMetadata } = await import("@/lib/seo/create-next-metadata");
  const resolved = await resolveSeoMetadata(input, options);
  return {
    metadata: createNextMetadata(resolved),
    resolved
  };
}

export { DEFAULT_SEO_SETTINGS_FALLBACK };
