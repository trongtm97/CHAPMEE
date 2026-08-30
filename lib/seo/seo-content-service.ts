import { and, count, desc, eq, ilike, isNull, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { seoContentBlocks, type SeoContentBlockRow } from "@/lib/db/schema/seo-center";
import {
  SEO_CONTENT_STATUSES,
  SEO_DEFAULT_LOCALE,
  type SeoContentStatus,
  type SeoPageType
} from "@/lib/seo/seo-constants";
import { normalizeSeoMarkdownHeadings } from "@/lib/seo/markdown-sanitize";
import type {
  SeoContentFaqItem,
  SeoContentInternalLink
} from "@/lib/seo/seo-types";
import { normalizeSeoPath } from "@/lib/seo/seo-validation";

export type SeoContentBlockUpsertInput = {
  pageType: string;
  targetType?: string | null;
  targetId?: string | null;
  routePath?: string | null;
  locale?: string;
  title: string;
  summary?: string | null;
  contentMarkdown: string;
  faqJson?: SeoContentFaqItem[] | null;
  internalLinksJson?: SeoContentInternalLink[] | null;
  isCollapsible?: boolean;
  status?: SeoContentStatus;
  updatedBy?: string | null;
  createdBy?: string | null;
};

export type ListSeoContentBlocksParams = {
  page?: number;
  pageSize?: number;
  pageType?: string;
  status?: string;
  locale?: string;
  search?: string;
};

export type GetSeoContentBlockParams = {
  routePath?: string | null;
  pageType?: SeoPageType | string | null;
  targetType?: string | null;
  targetId?: string | null;
  locale?: string;
};

export type ResolvedSeoContentBlock = {
  id: string;
  title: string;
  summary: string | null;
  contentMarkdown: string;
  faq: SeoContentFaqItem[];
  internalLinks: SeoContentInternalLink[];
  isCollapsible: boolean;
  pageType: string;
  routePath: string | null;
};

function normalizeRoutePath(path: string | null | undefined): string | null {
  if (!path?.trim()) {
    return null;
  }
  return normalizeSeoPath(path);
}

function parseFaqJson(value: unknown): SeoContentFaqItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const row = item as Record<string, unknown>;
      const question = String(row.question ?? "").trim();
      const answer = String(row.answer ?? "").trim();
      if (!question || !answer) {
        return null;
      }
      return { question, answer };
    })
    .filter((item): item is SeoContentFaqItem => item !== null);
}

function parseInternalLinksJson(value: unknown): SeoContentInternalLink[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const row = item as Record<string, unknown>;
      const label = String(row.label ?? "").trim();
      const url = String(row.url ?? "").trim();
      const note = String(row.note ?? "").trim();
      if (!label || !url) {
        return null;
      }
      return { label, url, ...(note ? { note } : {}) };
    })
    .filter((item): item is SeoContentInternalLink => item !== null);
}

function mapRowToResolved(row: SeoContentBlockRow): ResolvedSeoContentBlock {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    contentMarkdown: row.contentMarkdown,
    faq: parseFaqJson(row.faqJson),
    internalLinks: parseInternalLinksJson(row.internalLinksJson),
    isCollapsible: row.isCollapsible,
    pageType: row.pageType,
    routePath: row.routePath
  };
}

function buildListFilters(params: ListSeoContentBlocksParams): SQL | undefined {
  const clauses: SQL[] = [];

  if (params.pageType?.trim()) {
    clauses.push(eq(seoContentBlocks.pageType, params.pageType.trim()));
  }

  if (params.status?.trim() && (SEO_CONTENT_STATUSES as readonly string[]).includes(params.status)) {
    clauses.push(eq(seoContentBlocks.status, params.status.trim()));
  }

  if (params.locale?.trim()) {
    clauses.push(eq(seoContentBlocks.locale, params.locale.trim()));
  }

  const search = params.search?.trim();
  if (search) {
    const pattern = `%${search.replace(/[%_]/g, "")}%`;
    clauses.push(
      or(
        ilike(seoContentBlocks.title, pattern),
        ilike(seoContentBlocks.routePath, pattern),
        ilike(seoContentBlocks.pageType, pattern)
      )!
    );
  }

  if (clauses.length === 0) {
    return undefined;
  }

  return and(...clauses);
}

export async function listSeoContentBlocks(params: ListSeoContentBlocksParams = {}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, params.pageSize ?? 20));
  const offset = (page - 1) * pageSize;
  const where = buildListFilters(params);

  const [items, totalResult] = await Promise.all([
    db
      .select()
      .from(seoContentBlocks)
      .where(where)
      .orderBy(desc(seoContentBlocks.updatedAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ total: count() }).from(seoContentBlocks).where(where)
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

export async function getSeoContentBlockById(id: string): Promise<SeoContentBlockRow | null> {
  const rows = await db.select().from(seoContentBlocks).where(eq(seoContentBlocks.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getSeoContentBlock(
  params: GetSeoContentBlockParams
): Promise<ResolvedSeoContentBlock | null> {
  try {
    const locale = params.locale?.trim() || SEO_DEFAULT_LOCALE;
    const routePath = normalizeRoutePath(params.routePath);

    if (routePath) {
      const rows = await db
        .select()
        .from(seoContentBlocks)
        .where(
          and(
            eq(seoContentBlocks.status, "published"),
            eq(seoContentBlocks.locale, locale),
            eq(seoContentBlocks.routePath, routePath)
          )
        )
        .limit(1);
      if (rows[0]) {
        return mapRowToResolved(rows[0]);
      }
    }

    const pageType = params.pageType?.trim();
    const targetType = params.targetType?.trim();
    const targetId = params.targetId?.trim();

    if (pageType && targetType && targetId) {
      const rows = await db
        .select()
        .from(seoContentBlocks)
        .where(
          and(
            eq(seoContentBlocks.status, "published"),
            eq(seoContentBlocks.locale, locale),
            eq(seoContentBlocks.pageType, pageType),
            eq(seoContentBlocks.targetType, targetType),
            eq(seoContentBlocks.targetId, targetId)
          )
        )
        .limit(1);
      if (rows[0]) {
        return mapRowToResolved(rows[0]);
      }
    }

    if (pageType) {
      const rows = await db
        .select()
        .from(seoContentBlocks)
        .where(
          and(
            eq(seoContentBlocks.status, "published"),
            eq(seoContentBlocks.locale, locale),
            eq(seoContentBlocks.pageType, pageType),
            isNull(seoContentBlocks.targetType),
            isNull(seoContentBlocks.targetId),
            isNull(seoContentBlocks.routePath)
          )
        )
        .limit(1);
      if (rows[0]) {
        return mapRowToResolved(rows[0]);
      }
    }

    return null;
  } catch {
    return null;
  }
}

function buildPayload(input: SeoContentBlockUpsertInput) {
  return {
    pageType: input.pageType.trim(),
    targetType: input.targetType?.trim() || null,
    targetId: input.targetId?.trim() || null,
    routePath: input.routePath?.trim() ? normalizeRoutePath(input.routePath) : null,
    locale: input.locale?.trim() || SEO_DEFAULT_LOCALE,
    title: input.title.trim(),
    summary: input.summary?.trim() || null,
    contentMarkdown: normalizeSeoMarkdownHeadings(input.contentMarkdown.trim()),
    faqJson: input.faqJson ?? [],
    internalLinksJson: input.internalLinksJson ?? [],
    isCollapsible: input.isCollapsible ?? true,
    status: input.status ?? "draft",
    updatedBy: input.updatedBy ?? null,
    createdBy: input.createdBy ?? null,
    updatedAt: new Date()
  };
}

export async function createSeoContentBlock(input: SeoContentBlockUpsertInput) {
  const payload = buildPayload(input);
  const [row] = await db
    .insert(seoContentBlocks)
    .values({
      ...payload,
      publishedAt: payload.status === "published" ? new Date() : null
    })
    .returning();
  return row;
}

export async function updateSeoContentBlock(
  id: string,
  input: SeoContentBlockUpsertInput,
  existingPublishedAt?: Date | null
) {
  const payload = buildPayload(input);
  const publishedAt =
    payload.status === "published"
      ? existingPublishedAt ?? new Date()
      : payload.status === "draft"
        ? null
        : existingPublishedAt ?? null;

  const [row] = await db
    .update(seoContentBlocks)
    .set({
      ...payload,
      publishedAt
    })
    .where(eq(seoContentBlocks.id, id))
    .returning();
  return row ?? null;
}

export async function deleteSeoContentBlock(id: string) {
  const [row] = await db.delete(seoContentBlocks).where(eq(seoContentBlocks.id, id)).returning();
  return row ?? null;
}

export async function setSeoContentBlockStatus(
  id: string,
  status: SeoContentStatus,
  updatedBy?: string | null,
  existingPublishedAt?: Date | null
) {
  const publishedAt =
    status === "published"
      ? existingPublishedAt ?? new Date()
      : status === "draft"
        ? null
        : existingPublishedAt ?? null;

  const [row] = await db
    .update(seoContentBlocks)
    .set({
      status,
      updatedBy: updatedBy ?? null,
      updatedAt: new Date(),
      publishedAt
    })
    .where(eq(seoContentBlocks.id, id))
    .returning();
  return row ?? null;
}
