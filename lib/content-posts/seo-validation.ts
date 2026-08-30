import { validateContentPostSlug } from "@/lib/platform-content/slug";

export type ContentPostRobots = "index,follow" | "noindex,follow" | "noindex,nofollow";

export type ContentPostSeoIssue =
  | "missing_seo_title"
  | "missing_seo_description"
  | "seo_title_length"
  | "seo_description_length"
  | "invalid_slug"
  | "missing_excerpt"
  | "missing_cover"
  | "content_has_h1"
  | "missing_h2_long_content"
  | "invalid_canonical"
  | "index_without_seo";

export type ContentPostSeoCheckInput = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  postType: string;
  coverImageUrl: string;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  indexable: boolean;
};

const H1_MARKDOWN_REGEX = /^#\s+[^#]/m;
const H1_HTML_REGEX = /<h1[\s>]/i;
const H2_MARKDOWN_REGEX = /^##\s+/m;
const H2_HTML_REGEX = /<h2[\s>]/i;
const INTERNAL_LINK_REGEX = /\]\(\/[^)]+\)/g;

export function validateHeadingStructure(content: string): string[] {
  const issues: string[] = [];
  if (H1_MARKDOWN_REGEX.test(content) || H1_HTML_REGEX.test(content)) {
    issues.push("Nội dung không được chứa H1. Chỉ dùng H2/H3/H4.");
  }
  return issues;
}

export function countInternalLinks(content: string) {
  return content.match(INTERNAL_LINK_REGEX)?.length ?? 0;
}

export function countWords(content: string) {
  const text = content.replace(/[#>*_\[\]()`-]/g, " ").trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

export function estimateReadingMinutes(content: string) {
  const words = countWords(content);
  return Math.max(1, Math.ceil(words / 200));
}

export function countHeadings(content: string) {
  const h2 = (content.match(/^##\s+/gm) ?? []).length + (content.match(/<h2[\s>]/gi) ?? []).length;
  const h3 = (content.match(/^###\s+/gm) ?? []).length + (content.match(/<h3[\s>]/gi) ?? []).length;
  const h4 = (content.match(/^####\s+/gm) ?? []).length + (content.match(/<h4[\s>]/gi) ?? []).length;
  return { h2, h3, h4, total: h2 + h3 + h4 };
}

export function getContentPostSeoIssues(input: ContentPostSeoCheckInput): ContentPostSeoIssue[] {
  const issues: ContentPostSeoIssue[] = [];

  if (validateContentPostSlug(input.slug)) {
    issues.push("invalid_slug");
  }

  if (!input.excerpt.trim()) {
    issues.push("missing_excerpt");
  }

  if (input.indexable) {
    if (!input.seoTitle.trim()) issues.push("missing_seo_title");
    if (!input.seoDescription.trim()) issues.push("missing_seo_description");
    if (!input.seoTitle.trim() || !input.seoDescription.trim()) {
      issues.push("index_without_seo");
    }
  }

  const titleLen = input.seoTitle.trim().length || input.title.trim().length;
  if (titleLen > 0 && (titleLen < 30 || titleLen > 65)) {
    issues.push("seo_title_length");
  }

  const descLen = input.seoDescription.trim().length;
  if (descLen > 0 && (descLen < 70 || descLen > 160)) {
    issues.push("seo_description_length");
  }

  if (["article", "editorial", "news"].includes(input.postType) && !input.coverImageUrl.trim()) {
    issues.push("missing_cover");
  }

  if (H1_MARKDOWN_REGEX.test(input.content) || H1_HTML_REGEX.test(input.content)) {
    issues.push("content_has_h1");
  }

  const wordCount = countWords(input.content);
  if (wordCount > 400 && !H2_MARKDOWN_REGEX.test(input.content) && !H2_HTML_REGEX.test(input.content)) {
    issues.push("missing_h2_long_content");
  }

  const canonical = input.canonicalUrl.trim();
  if (canonical && !canonical.startsWith("/")) {
    issues.push("invalid_canonical");
  }

  return [...new Set(issues)];
}

export function getContentPostSeoScore(input: ContentPostSeoCheckInput): number {
  const issues = getContentPostSeoIssues(input);
  const critical = ["content_has_h1", "invalid_slug", "index_without_seo"];
  const warnings = ["missing_seo_title", "missing_seo_description", "missing_excerpt", "missing_cover", "missing_h2_long_content"];

  let score = 100;
  for (const issue of issues) {
    if (critical.includes(issue)) score -= 25;
    else if (warnings.includes(issue)) score -= 10;
    else score -= 5;
  }
  return Math.max(0, Math.min(100, score));
}

export function getSeoScoreLabel(score: number) {
  if (score >= 85) return { label: "Tốt", tone: "good" as const };
  if (score >= 60) return { label: "Khá", tone: "ok" as const };
  return { label: "Cần sửa", tone: "bad" as const };
}

export function getRobotsByStatus(input: {
  status: string;
  indexable: boolean;
  robots?: ContentPostRobots;
}): ContentPostRobots {
  if (input.robots) return input.robots;
  if (!input.indexable || input.status !== "published") {
    return "noindex,follow";
  }
  return "index,follow";
}

export function hasCriticalPublishBlockers(input: ContentPostSeoCheckInput) {
  const issues = getContentPostSeoIssues(input);
  return issues.some((issue) =>
    ["content_has_h1", "invalid_slug"].includes(issue)
  );
}
