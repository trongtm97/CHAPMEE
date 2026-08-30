import type { MetadataRoute } from "next";

import { buildCanonicalUrl } from "@/lib/seo/metadata";
import { escapeXml } from "@/lib/seo/xml-escape";

export const SITEMAP_STYLESHEET_PATH = "/sitemap.xsl";

function formatLastMod(value: Date | string | undefined): string | null {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function xmlStylesheetPi(stylesheetHref?: string | null): string {
  if (!stylesheetHref) {
    return "";
  }
  return `<?xml-stylesheet type="text/xsl" href="${escapeXml(stylesheetHref)}"?>\n`;
}

export function resolveSitemapStylesheetHref(): string | null {
  return buildCanonicalUrl(SITEMAP_STYLESHEET_PATH) ?? null;
}

export function buildUrlsetXml(
  entries: MetadataRoute.Sitemap,
  options?: { stylesheetHref?: string | null }
): string {
  const stylesheetHref = options?.stylesheetHref ?? resolveSitemapStylesheetHref();
  const body = entries
    .map((entry) => {
      const parts = [`    <loc>${escapeXml(entry.url)}</loc>`];
      const lastmod = formatLastMod(entry.lastModified);
      if (lastmod) {
        parts.push(`    <lastmod>${escapeXml(lastmod)}</lastmod>`);
      }
      if (entry.changeFrequency) {
        parts.push(`    <changefreq>${escapeXml(entry.changeFrequency)}</changefreq>`);
      }
      if (entry.priority != null) {
        parts.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
      }
      return `  <url>\n${parts.join("\n")}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n${xmlStylesheetPi(stylesheetHref)}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}

export type SitemapIndexLoc = {
  loc: string;
  lastModified?: Date | string | null;
};

export function buildSitemapIndexXml(
  locs: SitemapIndexLoc[],
  options?: { stylesheetHref?: string | null }
): string {
  const stylesheetHref = options?.stylesheetHref ?? resolveSitemapStylesheetHref();
  const body = locs
    .map((item) => {
      const parts = [`    <loc>${escapeXml(item.loc)}</loc>`];
      const lastmod = formatLastMod(item.lastModified ?? undefined);
      if (lastmod) {
        parts.push(`    <lastmod>${escapeXml(lastmod)}</lastmod>`);
      }
      return `  <sitemap>\n${parts.join("\n")}\n  </sitemap>`;
    })
    .join("\n");

  if (!body) {
    return `<?xml version="1.0" encoding="UTF-8"?>\n${xmlStylesheetPi(stylesheetHref)}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</sitemapindex>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n${xmlStylesheetPi(stylesheetHref)}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</sitemapindex>`;
}

export function sitemapXmlResponseHeaders(): HeadersInit {
  return {
    "Cache-Control": "public, max-age=3600, s-maxage=3600",
    "Content-Type": "application/xml; charset=utf-8"
  };
}
