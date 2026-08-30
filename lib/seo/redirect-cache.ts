import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { seoRedirects } from "@/lib/db/schema/seo-center";
import { normalizeSeoPath } from "@/lib/seo/seo-validation";

export type CachedSeoRedirect = {
  id: string;
  sourcePath: string;
  destinationPath: string;
  statusCode: number;
  preserveQuery: boolean;
};

const TTL_MS = 30_000;

let redirectMap: Map<string, CachedSeoRedirect> | null = null;
let loadedAt = 0;

const hitDebounce = new Map<string, number>();
const HIT_DEBOUNCE_MS = 5_000;

export function invalidateSeoRedirectCache() {
  redirectMap = null;
  loadedAt = 0;
}

export async function loadSeoRedirectMap(): Promise<Map<string, CachedSeoRedirect>> {
  if (redirectMap && Date.now() - loadedAt < TTL_MS) {
    return redirectMap;
  }

  const rows = await db
    .select({
      id: seoRedirects.id,
      sourcePath: seoRedirects.sourcePath,
      destinationPath: seoRedirects.destinationPath,
      statusCode: seoRedirects.statusCode,
      preserveQuery: seoRedirects.preserveQuery
    })
    .from(seoRedirects)
    .where(eq(seoRedirects.isEnabled, true));

  const map = new Map<string, CachedSeoRedirect>();
  for (const row of rows) {
    map.set(row.sourcePath, row);
  }

  redirectMap = map;
  loadedAt = Date.now();
  return map;
}

export async function lookupCachedSeoRedirect(
  pathname: string
): Promise<CachedSeoRedirect | null> {
  const normalized = normalizeSeoPath(pathname.split("?")[0]?.split("#")[0] ?? "/");
  const map = await loadSeoRedirectMap();
  return map.get(normalized) ?? null;
}

export function shouldRecordRedirectHit(redirectId: string): boolean {
  const now = Date.now();
  const last = hitDebounce.get(redirectId);
  if (last && now - last < HIT_DEBOUNCE_MS) {
    return false;
  }
  hitDebounce.set(redirectId, now);
  return true;
}
