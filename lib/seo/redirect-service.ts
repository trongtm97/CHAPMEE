import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { seoRedirects, type SeoRedirectRow } from "@/lib/db/schema/seo-center";
import { invalidateSeoRedirectCache, loadSeoRedirectMap } from "@/lib/seo/redirect-cache";
import {
  normalizeSeoPath,
  validateSeoRedirectInput
} from "@/lib/seo/seo-validation";
import type { SeoRedirectInput, SeoRedirectStatusCode } from "@/lib/seo/seo-types";
import { isSeoRedirectStatusCode } from "@/lib/seo/seo-validation";

const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

export type SeoRedirectUpsertInput = {
  sourcePath: string;
  destinationPath: string;
  statusCode?: SeoRedirectStatusCode;
  preserveQuery?: boolean;
  isEnabled?: boolean;
  note?: string | null;
  updatedBy?: string | null;
  createdBy?: string | null;
};

export type ListSeoRedirectsParams = {
  page?: number;
  pageSize?: number;
  enabled?: boolean | null;
  statusCode?: number;
  search?: string;
};

function buildListFilters(params: ListSeoRedirectsParams): SQL | undefined {
  const clauses: SQL[] = [];

  if (params.enabled === true) {
    clauses.push(eq(seoRedirects.isEnabled, true));
  } else if (params.enabled === false) {
    clauses.push(eq(seoRedirects.isEnabled, false));
  }

  if (params.statusCode != null) {
    clauses.push(eq(seoRedirects.statusCode, params.statusCode));
  }

  const search = params.search?.trim();
  if (search) {
    const pattern = `%${search.replace(/[%_]/g, "")}%`;
    clauses.push(
      or(
        ilike(seoRedirects.sourcePath, pattern),
        ilike(seoRedirects.destinationPath, pattern),
        ilike(seoRedirects.note, pattern)
      )!
    );
  }

  if (clauses.length === 0) {
    return undefined;
  }

  return and(...clauses);
}

export async function listSeoRedirects(params: ListSeoRedirectsParams = {}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, params.pageSize ?? 20));
  const offset = (page - 1) * pageSize;
  const where = buildListFilters(params);

  const [items, totalResult] = await Promise.all([
    db
      .select()
      .from(seoRedirects)
      .where(where)
      .orderBy(desc(seoRedirects.updatedAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ total: count() }).from(seoRedirects).where(where)
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

export async function getSeoRedirectById(id: string): Promise<SeoRedirectRow | null> {
  const rows = await db.select().from(seoRedirects).where(eq(seoRedirects.id, id)).limit(1);
  return rows[0] ?? null;
}

export function isExternalRedirectDestination(destinationPath: string): boolean {
  return ABSOLUTE_URL_REGEX.test(destinationPath.trim());
}

export async function wouldCreateRedirectLoop(
  sourcePath: string,
  destinationPath: string,
  excludeId?: string
): Promise<boolean> {
  const source = normalizeSeoPath(sourcePath);
  const dest = ABSOLUTE_URL_REGEX.test(destinationPath.trim())
    ? destinationPath.trim()
    : normalizeSeoPath(destinationPath);

  if (source === dest) {
    return true;
  }

  if (ABSOLUTE_URL_REGEX.test(dest)) {
    return false;
  }

  const map = await loadSeoRedirectMap();
  const visited = new Set<string>();
  let current: string | null = dest;
  const maxHops = 8;

  for (let hop = 0; hop < maxHops && current; hop++) {
    if (current === source) {
      return true;
    }
    if (visited.has(current)) {
      return true;
    }
    visited.add(current);

    const next = map.get(current);
    if (!next) {
      break;
    }
    if (excludeId && next.id === excludeId) {
      break;
    }
    if (ABSOLUTE_URL_REGEX.test(next.destinationPath)) {
      break;
    }
    current = normalizeSeoPath(next.destinationPath);
  }

  return false;
}

export async function validateSeoRedirectForAdmin(
  input: SeoRedirectInput,
  options?: { excludeId?: string }
): Promise<
  | { ok: true; normalized: { sourcePath: string; destinationPath: string }; warnings: string[] }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
> {
  const warnings: string[] = [];
  const base = validateSeoRedirectInput(input);
  if (!base.ok) {
    return { ok: false, error: base.error, fieldErrors: { sourcePath: base.error } };
  }

  if (isExternalRedirectDestination(base.normalized.destinationPath)) {
    warnings.push(
      "destination_path là URL ngoài — chỉ dùng khi chắc chắn; internal path (/) được khuyến nghị."
    );
  }

  const loop = await wouldCreateRedirectLoop(
    base.normalized.sourcePath,
    base.normalized.destinationPath,
    options?.excludeId
  );
  if (loop) {
    return {
      ok: false,
      error: "Redirect có thể tạo vòng lặp (A→B→…→A).",
      fieldErrors: { destinationPath: "Có thể gây redirect loop." }
    };
  }

  return { ok: true, normalized: base.normalized, warnings };
}

export async function createSeoRedirect(input: SeoRedirectUpsertInput) {
  const statusCode =
    input.statusCode != null && isSeoRedirectStatusCode(input.statusCode)
      ? input.statusCode
      : 301;

  const validation = await validateSeoRedirectForAdmin({
    sourcePath: input.sourcePath,
    destinationPath: input.destinationPath,
    statusCode,
    preserveQuery: input.preserveQuery,
    isEnabled: input.isEnabled
  });

  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const [row] = await db
    .insert(seoRedirects)
    .values({
      sourcePath: validation.normalized.sourcePath,
      destinationPath: validation.normalized.destinationPath,
      statusCode,
      preserveQuery: input.preserveQuery ?? true,
      isEnabled: input.isEnabled ?? true,
      note: input.note?.trim() || null,
      createdBy: input.createdBy ?? null,
      updatedBy: input.updatedBy ?? null
    })
    .returning();

  invalidateSeoRedirectCache();
  return row;
}

export async function updateSeoRedirect(id: string, input: SeoRedirectUpsertInput) {
  const statusCode =
    input.statusCode != null && isSeoRedirectStatusCode(input.statusCode)
      ? input.statusCode
      : 301;

  const validation = await validateSeoRedirectForAdmin(
    {
      sourcePath: input.sourcePath,
      destinationPath: input.destinationPath,
      statusCode,
      preserveQuery: input.preserveQuery,
      isEnabled: input.isEnabled
    },
    { excludeId: id }
  );

  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const [row] = await db
    .update(seoRedirects)
    .set({
      sourcePath: validation.normalized.sourcePath,
      destinationPath: validation.normalized.destinationPath,
      statusCode,
      preserveQuery: input.preserveQuery ?? true,
      isEnabled: input.isEnabled ?? true,
      note: input.note?.trim() || null,
      updatedBy: input.updatedBy ?? null,
      updatedAt: new Date()
    })
    .where(eq(seoRedirects.id, id))
    .returning();

  invalidateSeoRedirectCache();
  return row ?? null;
}

export async function deleteSeoRedirect(id: string) {
  const [row] = await db.delete(seoRedirects).where(eq(seoRedirects.id, id)).returning();
  invalidateSeoRedirectCache();
  return row ?? null;
}

export async function recordSeoRedirectHit(redirectId: string) {
  await db
    .update(seoRedirects)
    .set({
      hitCount: sql`hit_count + 1`,
      lastHitAt: new Date()
    })
    .where(eq(seoRedirects.id, redirectId));
}