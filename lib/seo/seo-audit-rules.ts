import type { SeoAuditIssue } from "@/lib/seo/seo-types";
import type { SeoPageType, SeoTargetType } from "@/lib/seo/seo-constants";
import { warnSeoDescriptionLength, warnSeoTitleLength } from "@/lib/seo/interpolate-seo-template";

/** Batch audit groups — run one at a time from admin. */
export const SEO_AUDIT_GROUPS = [
  "static",
  "stories",
  "taxonomy",
  "media",
  "articles",
  "profiles",
  "private_check",
  "redirects_404",
  "headings"
] as const;

export type SeoAuditGroup = (typeof SEO_AUDIT_GROUPS)[number];

export const SEO_AUDIT_GROUP_LABELS: Record<SeoAuditGroup, string> = {
  static: "Trang tĩnh public",
  stories: "Truyện published",
  taxonomy: "Taxonomy",
  media: "Media hub",
  articles: "Bài viết",
  profiles: "Hồ sơ public",
  private_check: "Kiểm tra noindex (private)",
  redirects_404: "Redirect / 404",
  headings: "Heading (H1)"
};

export const SEO_AUDIT_TABS = [
  { id: "overview", label: "Tổng quan" },
  { id: "missing_metadata", label: "Thiếu metadata" },
  { id: "missing_og", label: "Thiếu OG image" },
  { id: "noindex", label: "Noindex" },
  { id: "missing_content_block", label: "Thiếu SEO content block" },
  { id: "redirects_404", label: "Redirect / 404" },
  { id: "headings", label: "Heading issues" }
] as const;

export type SeoAuditTabId = (typeof SEO_AUDIT_TABS)[number]["id"];

export const SEO_AUDIT_DEFAULT_PAGE_SIZE = 25;
export const SEO_AUDIT_MAX_PAGE_SIZE = 50;

export const SEO_AUDIT_SCORE_WEIGHTS = {
  title: 15,
  description: 15,
  canonical: 10,
  robots: 10,
  ogImage: 15,
  contentBlock: 15,
  noCritical: 20
} as const;

export const THIN_DESCRIPTION_MIN = 50;

export type StaticAuditRoute = {
  path: string;
  pageType: SeoPageType;
  targetType: SeoTargetType;
  label: string;
  fallbackTitle: string;
  fallbackDescription: string;
  expectsContentBlock?: boolean;
};

/** Public static routes audited in MVP. */
export const STATIC_AUDIT_ROUTES: StaticAuditRoute[] = [
  {
    path: "/discover",
    pageType: "discover",
    targetType: "discover",
    label: "Khám phá",
    fallbackTitle: "Khám phá truyện, audio, video và cộng đồng | ChapMee",
    fallbackDescription:
      "Tìm truyện sáng tác, truyện dịch, audio, video và nội dung nổi bật trên ChapMee.",
    expectsContentBlock: true
  },
  {
    path: "/truyen",
    pageType: "story_catalog",
    targetType: "route",
    label: "Danh mục truyện",
    fallbackTitle: "Danh mục truyện ChapMee",
    fallbackDescription: "Duyệt danh mục truyện sáng tác và truyện dịch trên ChapMee.",
    expectsContentBlock: true
  },
  {
    path: "/media",
    pageType: "media",
    targetType: "media",
    label: "Media",
    fallbackTitle: "Media truyện: Audio và Video chuyển thể | ChapMee",
    fallbackDescription: "Khám phá audio truyện và video chuyển thể trên ChapMee.",
    expectsContentBlock: true
  },
  {
    path: "/bang-xep-hang",
    pageType: "ranking",
    targetType: "ranking",
    label: "Bảng xếp hạng",
    fallbackTitle: "Bảng xếp hạng truyện và tác giả | ChapMee",
    fallbackDescription: "Xem bảng xếp hạng truyện và tác giả nổi bật trên ChapMee.",
    expectsContentBlock: true
  },
  {
    path: "/truyen-sang-tac",
    pageType: "story_catalog",
    targetType: "route",
    label: "Truyện sáng tác",
    fallbackTitle: "Truyện sáng tác | ChapMee",
    fallbackDescription: "Danh sách truyện sáng tác trên ChapMee."
  },
  {
    path: "/truyen-dich",
    pageType: "story_catalog",
    targetType: "route",
    label: "Truyện dịch",
    fallbackTitle: "Truyện dịch | ChapMee",
    fallbackDescription: "Danh sách truyện dịch trên ChapMee."
  },
  {
    path: "/bai-viet",
    pageType: "article",
    targetType: "route",
    label: "Bài viết",
    fallbackTitle: "Bài viết | ChapMee",
    fallbackDescription: "Tin tức và bài viết từ ChapMee."
  },
  {
    path: "/community",
    pageType: "community",
    targetType: "route",
    label: "Cộng đồng",
    fallbackTitle: "Cộng đồng | ChapMee",
    fallbackDescription: "Cộng đồng đọc truyện trên ChapMee."
  },
  {
    path: "/reels",
    pageType: "reels",
    targetType: "route",
    label: "Reels",
    fallbackTitle: "ChapMee",
    fallbackDescription: "Lướt trích đoạn truyện trên ChapMee."
  }
];

export const MEDIA_AUDIT_ROUTES: StaticAuditRoute[] = [
  {
    path: "/media",
    pageType: "media",
    targetType: "media",
    label: "Media hub",
    fallbackTitle: "Media truyện: Audio và Video chuyển thể | ChapMee",
    fallbackDescription: "Khám phá audio truyện và video chuyển thể trên ChapMee.",
    expectsContentBlock: true
  },
  {
    path: "/truyen-sang-tac",
    pageType: "story_catalog",
    targetType: "route",
    label: "Truyện sáng tác",
    fallbackTitle: "Truyện sáng tác | ChapMee",
    fallbackDescription: "Danh sách truyện sáng tác trên ChapMee."
  },
  {
    path: "/truyen-dich",
    pageType: "story_catalog",
    targetType: "route",
    label: "Truyện dịch",
    fallbackTitle: "Truyện dịch | ChapMee",
    fallbackDescription: "Danh sách truyện dịch trên ChapMee."
  }
];

/** Private routes — only verify noindex policy, not metadata completeness. */
export const PRIVATE_AUDIT_PATHS = [
  "/admin",
  "/studio",
  "/me",
  "/messages",
  "/login",
  "/register",
  "/payment",
  "/settings",
  "/draft",
  "/preview"
];

export type SeoAuditIssueCode =
  | "missing_title"
  | "title_too_long"
  | "title_too_short"
  | "missing_description"
  | "description_too_long"
  | "description_too_short"
  | "thin_content"
  | "missing_canonical"
  | "canonical_localhost"
  | "missing_og_image"
  | "og_image_invalid"
  | "robots_should_noindex"
  | "robots_should_index"
  | "missing_content_block"
  | "private_route_indexable"
  | "redirect_404_spike"
  | "heading_multiple_h1"
  | "heading_check_todo";

export function issueMatchesTab(
  tab: SeoAuditTabId,
  issues: SeoAuditIssue[]
): boolean {
  if (tab === "overview") {
    return issues.length > 0;
  }

  const codes = new Set(issues.map((item) => item.code));

  switch (tab) {
    case "missing_metadata":
      return [
        "missing_title",
        "title_too_long",
        "title_too_short",
        "missing_description",
        "description_too_long",
        "description_too_short",
        "thin_content",
        "missing_canonical",
        "canonical_localhost"
      ].some((code) => codes.has(code));
    case "missing_og":
      return codes.has("missing_og_image") || codes.has("og_image_invalid");
    case "noindex":
      return (
        codes.has("robots_should_noindex") ||
        codes.has("robots_should_index") ||
        codes.has("private_route_indexable")
      );
    case "missing_content_block":
      return codes.has("missing_content_block");
    case "redirects_404":
      return codes.has("redirect_404_spike");
    case "headings":
      return codes.has("heading_multiple_h1") || codes.has("heading_check_todo");
    default:
      return true;
  }
}

export function buildTitleIssues(title: string): SeoAuditIssue[] {
  const issues: SeoAuditIssue[] = [];
  const trimmed = title.trim();

  if (!trimmed) {
    issues.push({
      code: "missing_title",
      severity: "error",
      message: "Thiếu title meta."
    });
    return issues;
  }

  for (const warning of warnSeoTitleLength(trimmed)) {
    if (warning.includes("dài")) {
      issues.push({ code: "title_too_long", severity: "warning", message: warning });
    } else if (warning.includes("ngắn")) {
      issues.push({ code: "title_too_short", severity: "warning", message: warning });
    }
  }

  return issues;
}

export function buildDescriptionIssues(description: string): SeoAuditIssue[] {
  const issues: SeoAuditIssue[] = [];
  const trimmed = description.trim();

  if (!trimmed) {
    issues.push({
      code: "missing_description",
      severity: "error",
      message: "Thiếu meta description."
    });
    return issues;
  }

  if (trimmed.length < THIN_DESCRIPTION_MIN) {
    issues.push({
      code: "thin_content",
      severity: "warning",
      message: `Description mỏng (${trimmed.length} ký tự; khuyến nghị ≥ ${THIN_DESCRIPTION_MIN}).`
    });
  }

  for (const warning of warnSeoDescriptionLength(trimmed)) {
    if (warning.includes("dài")) {
      issues.push({ code: "description_too_long", severity: "warning", message: warning });
    } else if (warning.includes("ngắn")) {
      issues.push({ code: "description_too_short", severity: "warning", message: warning });
    }
  }

  return issues;
}

export function computeSeoAuditScore(input: {
  title: string;
  description: string;
  canonical?: string | null;
  indexable: boolean;
  shouldBeIndexable: boolean;
  hasOgImage: boolean;
  expectsContentBlock: boolean;
  hasContentBlock: boolean;
  issues: SeoAuditIssue[];
}): number {
  let score = 0;
  const titleTrimmed = input.title.trim();
  const descTrimmed = input.description.trim();

  if (titleTrimmed && !input.issues.some((item) => item.code === "title_too_long")) {
    score += SEO_AUDIT_SCORE_WEIGHTS.title;
  } else if (titleTrimmed) {
    score += Math.round(SEO_AUDIT_SCORE_WEIGHTS.title * 0.5);
  }

  if (descTrimmed && !input.issues.some((item) => item.code === "description_too_long")) {
    score += SEO_AUDIT_SCORE_WEIGHTS.description;
  } else if (descTrimmed) {
    score += Math.round(SEO_AUDIT_SCORE_WEIGHTS.description * 0.5);
  }

  if (input.canonical && !input.issues.some((item) => item.code === "canonical_localhost")) {
    score += SEO_AUDIT_SCORE_WEIGHTS.canonical;
  }

  const robotsOk =
    input.shouldBeIndexable === input.indexable &&
    !input.issues.some(
      (item) =>
        item.code === "robots_should_index" ||
        item.code === "robots_should_noindex" ||
        item.code === "private_route_indexable"
    );
  if (robotsOk) {
    score += SEO_AUDIT_SCORE_WEIGHTS.robots;
  }

  if (input.hasOgImage && !input.issues.some((item) => item.code === "og_image_invalid")) {
    score += SEO_AUDIT_SCORE_WEIGHTS.ogImage;
  }

  if (!input.expectsContentBlock || input.hasContentBlock) {
    score += SEO_AUDIT_SCORE_WEIGHTS.contentBlock;
  }

  const hasCritical = input.issues.some((item) => item.severity === "critical");
  if (!hasCritical) {
    score += SEO_AUDIT_SCORE_WEIGHTS.noCritical;
  }

  return Math.max(0, Math.min(100, score));
}
