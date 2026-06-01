export {
  getSeoRuleForRoute,
  resolveRouteIndexable,
  listSeoRulesFromDb
} from "@/lib/seo/rules";

export { buildRobotsConfig } from "@/lib/seo/robots-config";
export { buildPublicSitemapEntries } from "@/lib/seo/sitemap";
export { runSeoAuditMvp } from "@/lib/seo/audit";
export { shouldNoIndexPath, patternMatchesRoute } from "@/lib/seo/noindex";
export {
  previewMetadataTemplate,
  validateMetadataTemplate,
  validateSeoRuleIndexable
} from "@/lib/seo/content-hub-seo-data";

import { patternMatchesRoute } from "@/lib/seo/noindex";
import type { SeoRule } from "@/types/platform-content";

export function shouldIndexRoute(route: string, rules: SeoRule[]): boolean {
  const matched = rules
    .filter((rule) => rule.is_active !== false && patternMatchesRoute(rule.route_pattern, route))
    .sort((a, b) => b.route_pattern.length - a.route_pattern.length)[0];
  return matched?.indexable ?? false;
}

export function shouldIncludeInSitemap(route: string, rules: SeoRule[]): boolean {
  const matched = rules
    .filter((rule) => rule.is_active !== false && patternMatchesRoute(rule.route_pattern, route))
    .sort((a, b) => b.route_pattern.length - a.route_pattern.length)[0];
  if (!matched) return false;
  return matched.indexable && (matched.include_sitemap ?? true);
}

export function getMetadataForPage(
  pageType: string,
  data: Record<string, string>,
  templates: Array<{ page_type: string; title_template: string | null; description_template: string | null }>
) {
  const template = templates.find((item) => item.page_type === pageType);
  if (!template) return { title: null, description: null };

  const replaceVars = (value: string | null) => {
    if (!value) return null;
    return value.replace(/\{\{([a-z0-9_]+)\}\}/gi, (_, key: string) => data[key] ?? `{{${key}}}`);
  };

  return {
    title: replaceVars(template.title_template),
    description: replaceVars(template.description_template)
  };
}

export type HeadingIssue = {
  code: string;
  message: string;
  severity: "critical" | "warning" | "info";
};

export function validateHeadingStructure(
  headings: Array<{ level: number; text: string }>
): HeadingIssue[] {
  const issues: HeadingIssue[] = [];
  const h1s = headings.filter((item) => item.level === 1);

  if (h1s.length === 0) {
    issues.push({ code: "missing_h1", message: "Thiếu H1", severity: "critical" });
  }
  if (h1s.length > 1) {
    issues.push({ code: "multiple_h1", message: "Nhiều hơn 1 H1", severity: "critical" });
  }

  for (const h1 of h1s) {
    if (!h1.text.trim()) {
      issues.push({ code: "empty_h1", message: "H1 rỗng", severity: "critical" });
    }
    if (h1.text.length > 120) {
      issues.push({ code: "h1_too_long", message: "H1 quá dài", severity: "warning" });
    }
  }

  let lastLevel = 0;
  for (const heading of headings) {
    if (lastLevel > 0 && heading.level > lastLevel + 1) {
      issues.push({
        code: "heading_skip",
        message: `Nhảy cấp heading H${lastLevel} → H${heading.level}`,
        severity: "warning"
      });
    }
    lastLevel = heading.level;
  }

  return issues;
}
