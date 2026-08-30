import type { Metadata } from "next";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { seoAuditResults } from "@/lib/db/schema/seo-center";
import { getTaxonomySitemapPaths } from "@/lib/discovery/sitemap-taxonomy";
import { listSeo404Logs } from "@/lib/seo/404-log-service";
import { getStoryUrl } from "@/lib/seo/canonical";
import { isNoIndexPath } from "@/lib/seo/noindex-policy";
import { resolveSeoMetadata } from "@/lib/seo/resolve-seo-metadata";
import { getSeoContentBlock } from "@/lib/seo/seo-content-service";
import type { SeoPageType, SeoTargetType } from "@/lib/seo/seo-constants";
import {
  MEDIA_AUDIT_ROUTES,
  PRIVATE_AUDIT_PATHS,
  SEO_AUDIT_DEFAULT_PAGE_SIZE,
  SEO_AUDIT_MAX_PAGE_SIZE,
  STATIC_AUDIT_ROUTES,
  buildDescriptionIssues,
  buildTitleIssues,
  computeSeoAuditScore,
  type SeoAuditGroup
} from "@/lib/seo/seo-audit-rules";
import type { SeoAuditIssue, SeoEntityData } from "@/lib/seo/seo-types";
import { isPrivateSeoPath } from "@/lib/seo/seo-validation";
import { getPublicAuthorUsernames } from "@/lib/seo/static-params";
import { getProfileUrl } from "@/lib/profile/profile-url";
import { createClient } from "@/lib/data/server";

export type SeoAuditTarget = {
  path: string;
  label: string;
  group: SeoAuditGroup;
  pageType: SeoPageType;
  targetType: SeoTargetType;
  targetId?: string | null;
  fallbackTitle?: string;
  fallbackDescription?: string;
  expectsContentBlock?: boolean;
  isPrivateCheck?: boolean;
  entityData?: SeoEntityData | null;
};

export type SeoAuditResultItem = {
  path: string;
  label: string;
  group: SeoAuditGroup;
  targetType: SeoTargetType;
  targetId?: string | null;
  score: number;
  issues: SeoAuditIssue[];
  preview: {
    title: string;
    description: string;
    canonical?: string;
    ogImageUrl?: string;
    indexable: boolean;
    hasOverride: boolean;
    hasContentBlock: boolean;
  };
  checkedAt: string;
};

export type SeoAuditBatchResult = {
  group: SeoAuditGroup;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: SeoAuditResultItem[];
  summary: {
    averageScore: number;
    issueCount: number;
    criticalCount: number;
  };
  error: string | null;
};

function clampPageSize(value: number) {
  return Math.min(SEO_AUDIT_MAX_PAGE_SIZE, Math.max(1, value || SEO_AUDIT_DEFAULT_PAGE_SIZE));
}

function isIndexableFromRobots(robots: Metadata["robots"] | undefined): boolean {
  if (!robots) {
    return true;
  }
  if (typeof robots === "string") {
    return !/noindex/i.test(robots);
  }
  return robots.index !== false;
}

function hasOgImage(resolved: Awaited<ReturnType<typeof resolveSeoMetadata>>): boolean {
  return Boolean(
    resolved.ogImageAssetId ||
      resolved.openGraph?.images?.length ||
      resolved.twitter?.images?.length
  );
}

async function auditTarget(target: SeoAuditTarget): Promise<SeoAuditResultItem> {
  const issues: SeoAuditIssue[] = [];
  const shouldBeIndexable = !target.isPrivateCheck && !isPrivateSeoPath(target.path);

  if (target.isPrivateCheck) {
    const shouldNoindex = isNoIndexPath(target.path);
    if (!shouldNoindex) {
      issues.push({
        code: "private_route_indexable",
        severity: "critical",
        message: "Route private có thể bị index — cần noindex."
      });
    }

    const resolved = await resolveSeoMetadata({
      path: target.path,
      pageType: target.pageType,
      targetType: target.targetType,
      isPrivatePage: true,
      fallbackTitle: target.label,
      fallbackDescription: "Private page"
    });

    const indexable = isIndexableFromRobots(resolved.robots);
    if (shouldNoindex && indexable) {
      issues.push({
        code: "robots_should_noindex",
        severity: "critical",
        message: "Metadata robots vẫn cho phép index."
      });
    }

    const score = computeSeoAuditScore({
      title: resolved.title,
      description: resolved.description,
      canonical: resolved.alternates?.canonical,
      indexable,
      shouldBeIndexable: false,
      hasOgImage: hasOgImage(resolved),
      expectsContentBlock: false,
      hasContentBlock: false,
      issues
    });

    return {
      path: target.path,
      label: target.label,
      group: target.group,
      targetType: target.targetType,
      targetId: target.targetId,
      score,
      issues,
      preview: {
        title: resolved.title,
        description: resolved.description,
        canonical: resolved.alternates?.canonical,
        ogImageUrl: resolved.openGraph?.images?.[0]?.url,
        indexable,
        hasOverride: resolved.sources.override,
        hasContentBlock: false
      },
      checkedAt: new Date().toISOString()
    };
  }

  const contentBlock = target.expectsContentBlock
    ? await getSeoContentBlock({
        routePath: target.path,
        pageType: target.pageType
      }).catch(() => null)
    : null;

  const resolved = await resolveSeoMetadata({
    path: target.path,
    pageType: target.pageType,
    targetType: target.targetType,
    targetId: target.targetId ?? null,
    fallbackTitle: target.fallbackTitle,
    fallbackDescription: target.fallbackDescription,
    entityData: target.entityData ?? null,
    isPrivatePage: isPrivateSeoPath(target.path)
  });

  issues.push(...buildTitleIssues(resolved.title));
  issues.push(...buildDescriptionIssues(resolved.description));

  for (const warning of resolved.warnings) {
    if (warning.toLowerCase().includes("og") || warning.toLowerCase().includes("image")) {
      issues.push({
        code: "og_image_invalid",
        severity: "warning",
        message: warning
      });
    }
  }

  const canonical = resolved.alternates?.canonical;
  if (!canonical) {
    issues.push({
      code: "missing_canonical",
      severity: "error",
      message: "Thiếu canonical URL."
    });
  } else if (/localhost|127\.0\.0\.1/i.test(canonical)) {
    issues.push({
      code: "canonical_localhost",
      severity: "critical",
      message: "Canonical trỏ localhost — cần NEXT_PUBLIC_SITE_URL production."
    });
  }

  const indexable = isIndexableFromRobots(resolved.robots);
  if (shouldBeIndexable && !indexable) {
    issues.push({
      code: "robots_should_index",
      severity: "error",
      message: "Trang public đang noindex."
    });
  }
  if (!shouldBeIndexable && indexable) {
    issues.push({
      code: "robots_should_noindex",
      severity: "critical",
      message: "Trang private đang được index."
    });
  }

  const ogOk = hasOgImage(resolved);
  if (!ogOk) {
    issues.push({
      code: "missing_og_image",
      severity: "warning",
      message: "Thiếu OG image (media_assets hoặc default)."
    });
  }

  if (target.expectsContentBlock && !contentBlock) {
    issues.push({
      code: "missing_content_block",
      severity: "warning",
      message: "Chưa có SEO content block published cho route này."
    });
  }

  const score = computeSeoAuditScore({
    title: resolved.title,
    description: resolved.description,
    canonical,
    indexable,
    shouldBeIndexable,
    hasOgImage: ogOk,
    expectsContentBlock: Boolean(target.expectsContentBlock),
    hasContentBlock: Boolean(contentBlock),
    issues
  });

  return {
    path: target.path,
    label: target.label,
    group: target.group,
    targetType: target.targetType,
    targetId: target.targetId,
    score,
    issues,
    preview: {
      title: resolved.title,
      description: resolved.description,
      canonical,
      ogImageUrl: resolved.openGraph?.images?.[0]?.url,
      indexable,
      hasOverride: resolved.sources.override,
      hasContentBlock: Boolean(contentBlock)
    },
    checkedAt: new Date().toISOString()
  };
}

async function countStories(): Promise<number> {
  const db = await createClient();
  const { count } = await db
    .from("stories")
    .select("id", { count: "exact", head: true })
    .eq("visibility", "public")
    .in("status", ["published", "approved"]);
  return count ?? 0;
}

async function loadStoryTargets(page: number, pageSize: number): Promise<SeoAuditTarget[]> {
  const db = await createClient();
  const offset = (page - 1) * pageSize;

  const { data } = await db
    .from("stories")
    .select("id, slug, public_code, title, hook, short_description")
    .eq("visibility", "public")
    .in("status", ["published", "approved"])
    .order("updated_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  return (data ?? []).map((story) => {
    const path =
      getStoryUrl({ slug: String(story.slug), public_code: String(story.public_code) }) ??
      `/truyen/${story.slug}`;
    return {
      path,
      label: String(story.title ?? story.slug),
      group: "stories" as const,
      pageType: "story_detail" as const,
      targetType: "story" as const,
      targetId: String(story.id),
      fallbackTitle: String(story.title ?? ""),
      fallbackDescription:
        String(story.short_description ?? "").trim() || String(story.hook ?? "").trim(),
      entityData: {
        storyTitle: String(story.title ?? ""),
        shortDescription: String(story.short_description ?? story.hook ?? ""),
        canonicalPath: path
      }
    };
  });
}

async function countArticles(): Promise<number> {
  const db = await createClient();
  const { count } = await db
    .from("admin_content_posts")
    .select("id", { count: "exact", head: true })
    .eq("status", "published");
  return count ?? 0;
}

async function loadArticleTargets(page: number, pageSize: number): Promise<SeoAuditTarget[]> {
  const db = await createClient();
  const offset = (page - 1) * pageSize;

  const { data } = await db
    .from("admin_content_posts")
    .select("id, slug, title, seo_title, seo_description, excerpt")
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  return (data ?? []).map((post) => ({
    path: `/bai-viet/${post.slug}`,
    label: String(post.title ?? post.slug),
    group: "articles" as const,
    pageType: "article" as const,
    targetType: "article" as const,
    targetId: String(post.id),
    fallbackTitle: String(post.seo_title ?? post.title ?? ""),
    fallbackDescription: String(post.seo_description ?? post.excerpt ?? ""),
    entityData: {
      postTitle: String(post.title ?? ""),
      excerpt: String(post.excerpt ?? ""),
      canonicalPath: `/bai-viet/${post.slug}`
    }
  }));
}

async function loadTaxonomyTargets(page: number, pageSize: number): Promise<SeoAuditTarget[]> {
  const paths = await getTaxonomySitemapPaths();
  const offset = (page - 1) * pageSize;
  const slice = paths.slice(offset, offset + pageSize);

  return slice.map((entry) => ({
    path: entry.pathname,
    label: entry.pathname,
    group: "taxonomy" as const,
    pageType: "taxonomy" as const,
    targetType: "taxonomy" as const,
    fallbackTitle: entry.pathname.split("/").pop() ?? entry.pathname,
    fallbackDescription: "Trang taxonomy trên ChapMee.",
    entityData: {
      taxonomyName: entry.pathname.split("/").pop() ?? "",
      canonicalPath: entry.pathname
    }
  }));
}

async function loadProfileTargets(page: number, pageSize: number): Promise<SeoAuditTarget[]> {
  const usernames = await getPublicAuthorUsernames(pageSize * page);
  const offset = (page - 1) * pageSize;
  const slice = usernames.slice(offset, offset + pageSize);

  return slice.map((username) => {
    const path = getProfileUrl(username) ?? `/@${username}`;
    return {
      path,
      label: `@${username}`,
      group: "profiles" as const,
      pageType: "profile" as const,
      targetType: "profile" as const,
      fallbackTitle: `@${username} | ChapMee`,
      fallbackDescription: `Hồ sơ công khai @${username} trên ChapMee.`,
      entityData: {
        username,
        authorName: username,
        canonicalPath: path
      }
    };
  });
}

async function loadGroupTargets(
  group: SeoAuditGroup,
  page: number,
  pageSize: number
): Promise<{ targets: SeoAuditTarget[]; total: number }> {
  switch (group) {
    case "static": {
      const all: SeoAuditTarget[] = STATIC_AUDIT_ROUTES.map((route) => ({
        ...route,
        group: "static"
      }));
      const offset = (page - 1) * pageSize;
      return {
        targets: all.slice(offset, offset + pageSize),
        total: all.length
      };
    }
    case "media": {
      const all: SeoAuditTarget[] = MEDIA_AUDIT_ROUTES.map((route) => ({
        ...route,
        group: "media"
      }));
      const offset = (page - 1) * pageSize;
      return {
        targets: all.slice(offset, offset + pageSize),
        total: all.length
      };
    }
    case "stories": {
      const total = await countStories();
      return { targets: await loadStoryTargets(page, pageSize), total };
    }
    case "articles": {
      const total = await countArticles();
      return { targets: await loadArticleTargets(page, pageSize), total };
    }
    case "taxonomy": {
      const paths = await getTaxonomySitemapPaths();
      const offset = (page - 1) * pageSize;
      return {
        targets: await loadTaxonomyTargets(page, pageSize),
        total: paths.length
      };
    }
    case "profiles": {
      const usernames = await getPublicAuthorUsernames(SEO_AUDIT_MAX_PAGE_SIZE * 20);
      const offset = (page - 1) * pageSize;
      return {
        targets: await loadProfileTargets(page, pageSize),
        total: usernames.length
      };
    }
    case "private_check": {
      const all = PRIVATE_AUDIT_PATHS.map((path) => ({
        path,
        label: path,
        group: "private_check" as const,
        pageType: "static" as const,
        targetType: "route" as const,
        isPrivateCheck: true
      }));
      const offset = (page - 1) * pageSize;
      return {
        targets: all.slice(offset, offset + pageSize),
        total: all.length
      };
    }
    case "headings": {
      return {
        targets: [
          {
            path: "/discover",
            label: "Heading audit (TODO)",
            group: "headings" as const,
            pageType: "discover" as const,
            targetType: "discover" as const,
            fallbackTitle: "Khám phá",
            fallbackDescription: "Heading check chưa bật — cần fetch HTML nội bộ nhẹ."
          }
        ],
        total: 1
      };
    }
    case "redirects_404":
    default:
      return { targets: [], total: 0 };
  }
}

async function loadRedirect404Items(
  page: number,
  pageSize: number
): Promise<SeoAuditResultItem[]> {
  const list = await listSeo404Logs({ page, pageSize });
  return list.items.map((row) => ({
    path: row.path,
    label: row.path,
    group: "redirects_404" as const,
    targetType: "route" as const,
    score: row.hitCount >= 10 ? 40 : 70,
    issues: [
      {
        code: "redirect_404_spike",
        severity: row.hitCount >= 10 ? ("error" as const) : ("warning" as const),
        message: `404 logged ${row.hitCount} lần — cân nhắc redirect.`,
        metadata: { hitCount: row.hitCount, lastSeenAt: row.lastSeenAt }
      }
    ],
    preview: {
      title: row.path,
      description: `404 hits: ${row.hitCount}`,
      indexable: false,
      hasOverride: false,
      hasContentBlock: false
    },
    checkedAt: new Date().toISOString()
  }));
}

export async function runSeoAuditBatch(input: {
  group: SeoAuditGroup;
  page?: number;
  pageSize?: number;
}): Promise<SeoAuditBatchResult> {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = clampPageSize(input.pageSize ?? SEO_AUDIT_DEFAULT_PAGE_SIZE);

  try {
    if (input.group === "redirects_404") {
      const list = await listSeo404Logs({ page, pageSize });
      const items = await loadRedirect404Items(page, pageSize);
      const issueCount = items.reduce((sum, item) => sum + item.issues.length, 0);
      const criticalCount = items.reduce(
        (sum, item) => sum + item.issues.filter((issue) => issue.severity === "critical").length,
        0
      );
      const averageScore =
        items.length > 0
          ? Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length)
          : 100;

      return {
        group: input.group,
        page,
        pageSize,
        total: list.total,
        totalPages: list.totalPages,
        items,
        summary: { averageScore, issueCount, criticalCount },
        error: null
      };
    }

    if (input.group === "headings") {
      const items: SeoAuditResultItem[] = [
        {
          path: "—",
          label: "Heading audit",
          group: "headings",
          targetType: "route",
          score: 0,
          issues: [
            {
              code: "heading_check_todo",
              severity: "info",
              message:
                "TODO: Kiểm tra H1 count cần fetch HTML render nội bộ nhẹ — chưa bật ở MVP để tránh crawler nặng."
            }
          ],
          preview: {
            title: "Heading audit",
            description: "Chưa triển khai",
            indexable: true,
            hasOverride: false,
            hasContentBlock: false
          },
          checkedAt: new Date().toISOString()
        }
      ];

      return {
        group: input.group,
        page: 1,
        pageSize: 1,
        total: 1,
        totalPages: 1,
        items,
        summary: { averageScore: 0, issueCount: 1, criticalCount: 0 },
        error: null
      };
    }

    const { targets, total } = await loadGroupTargets(input.group, page, pageSize);
    const items: SeoAuditResultItem[] = [];

    for (const target of targets) {
      items.push(await auditTarget(target));
    }

    await persistSeoAuditResults(items);

    const issueCount = items.reduce((sum, item) => sum + item.issues.length, 0);
    const criticalCount = items.reduce(
      (sum, item) => sum + item.issues.filter((issue) => issue.severity === "critical").length,
      0
    );
    const averageScore =
      items.length > 0
        ? Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length)
        : 100;

    return {
      group: input.group,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      items,
      summary: { averageScore, issueCount, criticalCount },
      error: null
    };
  } catch (error) {
    return {
      group: input.group,
      page,
      pageSize,
      total: 0,
      totalPages: 1,
      items: [],
      summary: { averageScore: 0, issueCount: 0, criticalCount: 0 },
      error: error instanceof Error ? error.message : "Không thể chạy audit."
    };
  }
}

export async function persistSeoAuditResults(items: SeoAuditResultItem[]) {
  if (items.length === 0) {
    return;
  }

  for (const item of items.slice(0, SEO_AUDIT_MAX_PAGE_SIZE)) {
    const path = item.path;
    if (!path || path === "—") {
      continue;
    }

    const existing = await db
      .select({ id: seoAuditResults.id })
      .from(seoAuditResults)
      .where(and(eq(seoAuditResults.path, path), eq(seoAuditResults.targetType, item.targetType)))
      .limit(1);

    const payload = {
      targetType: item.targetType,
      targetId: item.targetId ?? null,
      path,
      score: item.score,
      issuesJson: item.issues,
      lastCheckedAt: new Date(),
      updatedAt: new Date()
    };

    if (existing[0]) {
      await db.update(seoAuditResults).set(payload).where(eq(seoAuditResults.id, existing[0].id));
    } else {
      await db.insert(seoAuditResults).values(payload);
    }
  }
}

export async function listRecentSeoAuditResults(limit = 50): Promise<SeoAuditResultItem[]> {
  const rows = await db
    .select()
    .from(seoAuditResults)
    .orderBy(desc(seoAuditResults.lastCheckedAt))
    .limit(limit);

  return rows.map((row) => ({
    path: row.path ?? "—",
    label: row.path ?? row.targetType,
    group: "static",
    targetType: row.targetType as SeoTargetType,
    targetId: row.targetId,
    score: row.score ?? 0,
    issues: (row.issuesJson as SeoAuditIssue[]) ?? [],
    preview: {
      title: "",
      description: "",
      indexable: true,
      hasOverride: false,
      hasContentBlock: false
    },
    checkedAt: row.lastCheckedAt?.toISOString() ?? new Date().toISOString()
  }));
}

export type { SeoAuditGroup } from "@/lib/seo/seo-audit-rules";
