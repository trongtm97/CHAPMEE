import { and, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { seoOverrides, seoSettings, type SeoOverrideRow } from "@/lib/db/schema/seo-center";
import { SEO_DEFAULT_LOCALE } from "@/lib/seo/seo-constants";
import { normalizeSeoPath } from "@/lib/seo/seo-validation";

export type SeoSettingsUpdateInput = {
  siteName: string;
  defaultTitleTemplate: string;
  defaultDescriptionTemplate: string;
  titleSeparator: string;
  defaultOgImageAssetId?: string | null;
  defaultRobotsIndex: boolean;
  defaultRobotsFollow: boolean;
  sitemapEnabled: boolean;
  robotsEnabled: boolean;
};

export type SeoOverrideUpsertInput = {
  targetType: string;
  targetId?: string | null;
  path?: string | null;
  locale?: string;
  title?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageAssetId?: string | null;
  twitterTitle?: string | null;
  twitterDescription?: string | null;
  twitterImageAssetId?: string | null;
  robotsIndex?: boolean | null;
  robotsFollow?: boolean | null;
  schemaType?: string | null;
  extraJsonLd?: unknown;
  isEnabled?: boolean;
  updatedBy?: string | null;
  createdBy?: string | null;
};

export type ListSeoOverridesParams = {
  page?: number;
  pageSize?: number;
  targetType?: string;
  enabled?: boolean | null;
  locale?: string;
  search?: string;
};

export async function getSeoSettingsRow() {
  const rows = await db.select().from(seoSettings).limit(1);
  return rows[0] ?? null;
}

export async function updateSeoSettingsRow(input: SeoSettingsUpdateInput) {
  const existing = await getSeoSettingsRow();
  const payload = {
    siteName: input.siteName.trim(),
    defaultTitleTemplate: input.defaultTitleTemplate.trim(),
    defaultDescriptionTemplate: input.defaultDescriptionTemplate.trim(),
    titleSeparator: input.titleSeparator.trim() || "|",
    defaultOgImageAssetId: input.defaultOgImageAssetId?.trim() || null,
    defaultRobotsIndex: input.defaultRobotsIndex,
    defaultRobotsFollow: input.defaultRobotsFollow,
    sitemapEnabled: input.sitemapEnabled,
    robotsEnabled: input.robotsEnabled,
    updatedAt: new Date()
  };

  if (existing) {
    const [row] = await db
      .update(seoSettings)
      .set(payload)
      .where(eq(seoSettings.id, existing.id))
      .returning();
    return row;
  }

  const [row] = await db.insert(seoSettings).values(payload).returning();
  return row;
}

function buildOverrideFilters(params: ListSeoOverridesParams): SQL | undefined {
  const clauses: SQL[] = [];

  if (params.targetType?.trim()) {
    clauses.push(eq(seoOverrides.targetType, params.targetType.trim()));
  }

  if (params.enabled === true) {
    clauses.push(eq(seoOverrides.isEnabled, true));
  } else if (params.enabled === false) {
    clauses.push(eq(seoOverrides.isEnabled, false));
  }

  if (params.locale?.trim()) {
    clauses.push(eq(seoOverrides.locale, params.locale.trim()));
  }

  const search = params.search?.trim();
  if (search) {
    const pattern = `%${search.replace(/[%_]/g, "")}%`;
    clauses.push(
      or(
        ilike(seoOverrides.path, pattern),
        ilike(seoOverrides.title, pattern),
        ilike(seoOverrides.metaDescription, pattern),
        ilike(seoOverrides.targetType, pattern),
        sql`${seoOverrides.targetId}::text ilike ${pattern}`
      )!
    );
  }

  if (clauses.length === 0) {
    return undefined;
  }

  return and(...clauses);
}

export async function listSeoOverrides(params: ListSeoOverridesParams = {}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, params.pageSize ?? 20));
  const offset = (page - 1) * pageSize;
  const where = buildOverrideFilters(params);

  const [items, totalResult] = await Promise.all([
    db
      .select()
      .from(seoOverrides)
      .where(where)
      .orderBy(desc(seoOverrides.updatedAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ total: count() }).from(seoOverrides).where(where)
  ]);

  const total = Number(totalResult[0]?.total ?? 0);
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  };
}

export async function getSeoOverrideById(id: string): Promise<SeoOverrideRow | null> {
  const rows = await db.select().from(seoOverrides).where(eq(seoOverrides.id, id)).limit(1);
  return rows[0] ?? null;
}

/** Find latest override row for a path (any enabled state) — used by quick-edit flow. */
export async function findSeoOverrideByPath(path: string): Promise<SeoOverrideRow | null> {
  const normalized = normalizeSeoPath(path);
  if (!normalized) {
    return null;
  }

  const rows = await db
    .select()
    .from(seoOverrides)
    .where(and(eq(seoOverrides.path, normalized), eq(seoOverrides.locale, SEO_DEFAULT_LOCALE)))
    .orderBy(desc(seoOverrides.updatedAt))
    .limit(1);

  return rows[0] ?? null;
}

/** Lookup enabled overrides for a set of public paths (page SEO catalog). */
export async function getSeoOverridesForPaths(paths: string[]): Promise<Map<string, SeoOverrideRow>> {
  const normalized = [...new Set(paths.map((path) => normalizeSeoPath(path)).filter(Boolean))];
  if (normalized.length === 0) {
    return new Map();
  }

  const rows = await db
    .select()
    .from(seoOverrides)
    .where(
      and(
        eq(seoOverrides.isEnabled, true),
        eq(seoOverrides.locale, SEO_DEFAULT_LOCALE),
        eq(seoOverrides.targetType, "route"),
        inArray(seoOverrides.path, normalized)
      )
    );

  const map = new Map<string, SeoOverrideRow>();
  for (const row of rows) {
    if (row.path) {
      map.set(row.path, row);
    }
  }
  return map;
}

export async function createSeoOverride(input: SeoOverrideUpsertInput) {
  const path = input.path?.trim() ? normalizeSeoPath(input.path) : null;
  const [row] = await db
    .insert(seoOverrides)
    .values({
      targetType: input.targetType,
      targetId: input.targetId?.trim() || null,
      path,
      locale: input.locale?.trim() || SEO_DEFAULT_LOCALE,
      title: input.title?.trim() || null,
      metaDescription: input.metaDescription?.trim() || null,
      canonicalUrl: input.canonicalUrl?.trim() || null,
      ogTitle: input.ogTitle?.trim() || null,
      ogDescription: input.ogDescription?.trim() || null,
      ogImageAssetId: input.ogImageAssetId?.trim() || null,
      twitterTitle: input.twitterTitle?.trim() || null,
      twitterDescription: input.twitterDescription?.trim() || null,
      twitterImageAssetId: input.twitterImageAssetId?.trim() || null,
      robotsIndex: input.robotsIndex ?? null,
      robotsFollow: input.robotsFollow ?? null,
      schemaType: input.schemaType?.trim() || null,
      extraJsonLd: input.extraJsonLd ?? null,
      isEnabled: input.isEnabled ?? true,
      createdBy: input.createdBy ?? null,
      updatedBy: input.updatedBy ?? null
    })
    .returning();

  return row;
}

export async function updateSeoOverride(id: string, input: SeoOverrideUpsertInput) {
  const path = input.path?.trim() ? normalizeSeoPath(input.path) : input.path === "" ? null : undefined;

  const [row] = await db
    .update(seoOverrides)
    .set({
      targetType: input.targetType,
      targetId: input.targetId === undefined ? undefined : input.targetId?.trim() || null,
      ...(path !== undefined ? { path } : {}),
      locale: input.locale?.trim() || SEO_DEFAULT_LOCALE,
      title: input.title?.trim() || null,
      metaDescription: input.metaDescription?.trim() || null,
      canonicalUrl: input.canonicalUrl?.trim() || null,
      ogTitle: input.ogTitle?.trim() || null,
      ogDescription: input.ogDescription?.trim() || null,
      ogImageAssetId: input.ogImageAssetId?.trim() || null,
      twitterTitle: input.twitterTitle?.trim() || null,
      twitterDescription: input.twitterDescription?.trim() || null,
      twitterImageAssetId: input.twitterImageAssetId?.trim() || null,
      robotsIndex: input.robotsIndex ?? null,
      robotsFollow: input.robotsFollow ?? null,
      schemaType: input.schemaType?.trim() || null,
      extraJsonLd: input.extraJsonLd ?? null,
      isEnabled: input.isEnabled ?? true,
      updatedBy: input.updatedBy ?? null,
      updatedAt: new Date()
    })
    .where(eq(seoOverrides.id, id))
    .returning();

  return row ?? null;
}

export async function deleteSeoOverride(id: string) {
  const [row] = await db.delete(seoOverrides).where(eq(seoOverrides.id, id)).returning();
  return row ?? null;
}

export async function countSeoOverrides() {
  const result = await db.select({ total: count() }).from(seoOverrides);
  return Number(result[0]?.total ?? 0);
}
