"use server";

import { revalidatePath } from "next/cache";
import { appendSeoChangeLog } from "@/lib/seo/change-logs";
import { runSeoAuditMvp } from "@/lib/seo/audit";
import { validateSeoRuleIndexable } from "@/lib/seo/content-hub-seo-data";
import { SEO_HEADING_RULES } from "@/lib/seo/content-hub-seo-data";
import {
  listSeoMetadataTemplates,
  updateSeoMetadataTemplate,
  validateSeoTemplateLength
} from "@/lib/seo/metadata-templates-store";
import { buildRobotsConfig } from "@/lib/seo/robots-config";
import {
  bulkUpdateSeoRulesInDb,
  computeSeoRuleStats,
  getSeoRuleById,
  listSeoRulesFromDb
} from "@/lib/seo/rules";
import { listSeoChangeLogs } from "@/lib/seo/change-logs";
import { buildPublicSitemapEntries } from "@/lib/seo/sitemap";
import { buildSitemapSegmentEntries } from "@/lib/seo/sitemap-builders";
import {
  childSitemapPaths,
  countSitemapBreakdown,
  SITEMAP_SEGMENT_IDS
} from "@/lib/seo/sitemap-segments";
import { loadTaxonomySeoGovernanceSnapshot } from "@/lib/admin/taxonomy-seo-governance";
import type {
  SeoControlCenterData,
  SeoHeadingGovernanceRule,
  SeoQuickAlert,
  SeoRuleActionResult
} from "@/types/admin-seo";
import type { SeoRule } from "@/types/platform-content";

const SEO_PATHS = ["/admin/seo", "/admin/seo/rules", "/admin/content-hub/platform"];

function revalidateSeo() {
  for (const path of SEO_PATHS) revalidatePath(path);
}

async function requireSeoView() {
  const { checkStaffPermission } = await import("@/lib/auth/staff-guards");
  const view = await checkStaffPermission("seo.rule.view");
  if (view.ok) return view;
  return checkStaffPermission("admin.dashboard.view");
}

async function requireSeoUpdate() {
  const { checkStaffPermission } = await import("@/lib/auth/staff-guards");
  return checkStaffPermission("seo.rule.update");
}

export async function loadSeoControlCenterData(): Promise<SeoControlCenterData> {
  const staff = await requireSeoView();
  if (!staff.ok) {
    return emptyData(staff.error);
  }

  const [rulesResult, auditResult, templatesResult, changeLogsResult, sitemapEntries, taxonomySeo, segmentCounts] =
    await Promise.all([
      listSeoRulesFromDb(),
      runSeoAuditMvp(),
      listSeoMetadataTemplates(),
      (async () => {
        const { createClient } = await import("@/lib/supabase/server");
        return listSeoChangeLogs(await createClient(), 100);
      })(),
      buildPublicSitemapEntries().catch(() => []),
      loadTaxonomySeoGovernanceSnapshot().catch(() => null),
      Promise.all(
        SITEMAP_SEGMENT_IDS.map(async (id) => {
          const entries = await buildSitemapSegmentEntries(id).catch(() => []);
          return { id, count: entries.length };
        })
      )
    ]);

  const ruleStats = computeSeoRuleStats(rulesResult.items);
  const findings = auditResult.findings;
  const headingRules = buildHeadingRules(findings);
  const quickAlerts = buildQuickAlerts(
    rulesResult.items,
    findings,
    sitemapEntries.length,
    taxonomySeo
  );

  const sitemapBreakdown = countSitemapBreakdown(sitemapEntries);
  const childSitemaps = childSitemapPaths().map((child) => {
    const match = segmentCounts.find((row) => row.id === child.id);
    return { id: child.id, path: child.path, urlCount: match?.count ?? 0 };
  });

  return {
    stats: {
      ...ruleStats,
      metadataTemplates: templatesResult.items.length,
      headingIssues: headingRules.reduce((sum, rule) => sum + rule.issues.length, 0),
      auditFindings: findings.length,
      criticalFindings: findings.filter((item) => item.severity === "critical").length,
      warningFindings: findings.filter(
        (item) => item.severity === "warning" || item.severity === "error"
      ).length,
      sitemapStatus: "ok",
      robotsStatus: "ok"
    },
    quickAlerts,
    rules: rulesResult.items,
    findings,
    metadataTemplates: templatesResult.items,
    headingRules,
    changeLogs: changeLogsResult.items,
    sitemapStats: {
      url: "/sitemap.xml",
      lastGenerated: new Date().toISOString(),
      totalUrls: sitemapEntries.length,
      indexedUrls: sitemapEntries.length,
      excludedUrls: Math.max(0, ruleStats.sitemapExcluded),
      errorCount: 0,
      breakdown: sitemapBreakdown,
      childSitemaps
    },
    error: rulesResult.error ?? auditResult.error ?? templatesResult.error ?? changeLogsResult.error
  };
}

function emptyData(error: string): SeoControlCenterData {
  return {
    stats: {
      totalRules: 0,
      indexableRules: 0,
      noindexRules: 0,
      followRules: 0,
      nofollowRules: 0,
      sitemapIncluded: 0,
      sitemapExcluded: 0,
      metadataTemplates: 0,
      headingIssues: 0,
      auditFindings: 0,
      criticalFindings: 0,
      warningFindings: 0,
      sitemapStatus: "ok",
      robotsStatus: "ok"
    },
    quickAlerts: [],
    rules: [],
    findings: [],
    metadataTemplates: [],
    headingRules: [],
    changeLogs: [],
    sitemapStats: {
      url: "/sitemap.xml",
      lastGenerated: null,
      totalUrls: 0,
      indexedUrls: 0,
      excludedUrls: 0,
      errorCount: 0,
      breakdown: {},
      childSitemaps: []
    },
    error
  };
}

function buildHeadingRules(
  findings: SeoControlCenterData["findings"]
): SeoHeadingGovernanceRule[] {
  return SEO_HEADING_RULES.map((rule, index) => {
    const related = findings.filter(
      (f) => f.issue_type.includes("h1") || f.issue_type.includes("heading")
    );
    return {
      id: `heading-${index}`,
      page_type: rule.pageGroup,
      route_example: routeExampleForPageGroup(rule.pageGroup),
      expected_h1: rule.h1Source,
      allowed_h2: rule.allowedH2,
      allowed_h3: [],
      notes: rule.commonMistakes.join("; "),
      is_active: true,
      status: rule.status,
      last_audit: related[0] ? new Date().toISOString() : null,
      issues: related.map((f) => f.message).slice(0, 3)
    };
  });
}

function routeExampleForPageGroup(pageGroup: string) {
  const map: Record<string, string> = {
    story_detail: "/truyen/ten-truyen",
    chapter: "/truyen/ten-truyen/chuong/1",
    author_profile: "/@username",
    content_post: "/bai-viet/slug",
    discover: "/discover",
    reels: "/reels",
    studio: "/studio",
    admin: "/admin/seo"
  };
  return map[pageGroup] ?? "/";
}

function buildQuickAlerts(
  rules: SeoRule[],
  findings: SeoControlCenterData["findings"],
  sitemapCount: number,
  taxonomySeo: Awaited<ReturnType<typeof loadTaxonomySeoGovernanceSnapshot>> | null
): SeoQuickAlert[] {
  const missingTitle = findings.filter((f) => f.issue_type.includes("missing_seo_title")).length;
  const missingDesc = findings.filter((f) => f.issue_type.includes("missing_seo_description")).length;
  const privateIndexed = findings.filter((f) => f.issue_type === "private_route_indexable").length;
  const taxStats = taxonomySeo?.stats;

  return [
    {
      id: "missing_title",
      label: "Trang public thiếu title",
      count: missingTitle,
      tone: missingTitle > 0 ? "warning" : "ok"
    },
    {
      id: "missing_desc",
      label: "Trang public thiếu description",
      count: missingDesc,
      tone: missingDesc > 0 ? "warning" : "ok"
    },
    {
      id: "private_index",
      label: "Route private đang index",
      count: privateIndexed,
      tone: privateIndexed > 0 ? "critical" : "ok"
    },
    {
      id: "sitemap_urls",
      label: "URL trong sitemap",
      count: sitemapCount,
      tone: "info"
    },
    {
      id: "taxonomy_indexable",
      label: "Taxonomy indexable",
      count: taxStats?.indexableCount ?? 0,
      tone: "info"
    },
    {
      id: "taxonomy_missing_seo_title",
      label: "Taxonomy thiếu SEO title",
      count: taxStats?.missingSeoTitle ?? 0,
      tone: (taxStats?.missingSeoTitle ?? 0) > 0 ? "warning" : "ok"
    },
    {
      id: "taxonomy_seo_not_public",
      label: "SEO bật nhưng không public",
      count: taxStats?.seoButNotPublic ?? 0,
      tone: (taxStats?.seoButNotPublic ?? 0) > 0 ? "critical" : "ok"
    },
    {
      id: "total_rules",
      label: "Quy tắc SEO active",
      count: rules.filter((r) => r.is_active !== false).length,
      tone: "info"
    }
  ];
}

export async function bulkUpdateSeoRulesAction(input: {
  ids: string[];
  patch: Partial<Pick<SeoRule, "indexable" | "follow_links" | "include_sitemap" | "is_active">>;
  confirmDangerous?: boolean;
}): Promise<SeoRuleActionResult> {
  const staff = await requireSeoUpdate();
  if (!staff.ok) return { ok: false, message: staff.error };

  if (input.patch.indexable === true) {
    for (const id of input.ids) {
      const rule = await getSeoRuleById(id);
      if (rule.item) {
        const err = validateSeoRuleIndexable({
          routePattern: rule.item.route_pattern,
          indexable: true
        });
        if (err && !input.confirmDangerous) {
          return { ok: false, message: `${err} Cần xác nhận nguy hiểm.` };
        }
      }
    }
  }

  const result = await bulkUpdateSeoRulesInDb(input.ids, input.patch);
  if (result.error) return { ok: false, message: result.error };

  const { createClient } = await import("@/lib/supabase/server");
  await appendSeoChangeLog(await createClient(), {
    entityType: "seo_rule",
    action: "bulk_update_rules",
    after: { ids: input.ids, patch: input.patch },
    changedBy: staff.userId
  });

  revalidateSeo();
  return { ok: true, message: `Đã cập nhật ${result.updated} quy tắc.` };
}

export async function saveSeoMetadataTemplateAction(input: {
  page_type: string;
  title_template?: string;
  description_template?: string;
  og_title_template?: string;
  og_description_template?: string;
  robots_directive?: string;
  canonical_mode?: string;
}): Promise<SeoRuleActionResult> {
  const staff = await requireSeoUpdate();
  if (!staff.ok) return { ok: false, message: staff.error };

  const lengthErrors = validateSeoTemplateLength(
    input.title_template ?? null,
    input.description_template ?? null
  );
  if (lengthErrors.length > 0) {
    return { ok: false, message: lengthErrors[0] };
  }

  const result = await updateSeoMetadataTemplate(input.page_type, input, staff.userId);
  if (result.error) return { ok: false, message: result.error };

  const { createClient } = await import("@/lib/supabase/server");
  await appendSeoChangeLog(await createClient(), {
    entityType: "metadata_template",
    entityId: input.page_type,
    action: "update_metadata_template",
    after: input as Record<string, unknown>,
    changedBy: staff.userId
  });

  revalidateSeo();
  return { ok: true, message: "Đã lưu mẫu metadata." };
}

export async function getRobotsPreviewAction() {
  const config = buildRobotsConfig();
  const rules = Array.isArray(config.rules)
    ? config.rules
    : config.rules
      ? [config.rules]
      : [];
  const rule = rules[0];
  const lines = [`User-agent: ${rule?.userAgent ?? "*"}`];
  const allowList = rule?.allow ? (Array.isArray(rule.allow) ? rule.allow : [rule.allow]) : [];
  const disallowList = rule?.disallow
    ? Array.isArray(rule.disallow)
      ? rule.disallow
      : [rule.disallow]
    : [];
  for (const allow of allowList) lines.push(`Allow: ${allow}`);
  for (const disallow of disallowList) lines.push(`Disallow: ${disallow}`);
  if (config.sitemap) lines.push(`Sitemap: ${config.sitemap}`);
  return lines.join("\n");
}
