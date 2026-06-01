import { runTaxonomySeoAuditFindings } from "@/lib/seo/audit-taxonomy";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_NOINDEX_ROUTE_PATTERNS } from "@/lib/seo/noindex";
import { listSeoRulesFromDb } from "@/lib/seo/rules";
import { isValidSeoSlug, validateSeoSlug } from "@/lib/seo/slug";
import type { SeoAuditLog, SeoRule } from "@/types/platform-content";

export type SeoAuditFinding = {
  id: string;
  severity: SeoAuditLog["severity"];
  issue_type: string;
  route: string;
  message: string;
  metadata?: Record<string, unknown>;
};

export type SeoAuditReport = {
  rules: SeoRule[];
  findings: SeoAuditFinding[];
  error: string | null;
};

function finding(
  partial: Omit<SeoAuditFinding, "id"> & { id?: string }
): SeoAuditFinding {
  return {
    id: partial.id ?? `${partial.issue_type}:${partial.route}`,
    ...partial
  };
}

function isPrivatePattern(pattern: string) {
  const normalized = pattern.replace(/\/\*$/, "");
  return DEFAULT_NOINDEX_ROUTE_PATTERNS.some(
    (item) => !item.indexable && (item.pattern === pattern || item.pattern.replace(/\/\*$/, "") === normalized)
  );
}

export async function runSeoAuditMvp(): Promise<SeoAuditReport> {
  const findings: SeoAuditFinding[] = [];
  const rulesResult = await listSeoRulesFromDb();

  if (rulesResult.error) {
    return { rules: [], findings: [], error: rulesResult.error };
  }

  const rules = rulesResult.items;

  for (const rule of rules) {
    if (rule.indexable && isPrivatePattern(rule.route_pattern)) {
      findings.push(
        finding({
          severity: "critical",
          issue_type: "private_route_indexable",
          route: rule.route_pattern,
          message: `Rule "${rule.route_pattern}" đang bật index nhưng thuộc nhóm private mặc định.`,
          metadata: { rule_id: rule.id }
        })
      );
    }

    if (rule.canonical_mode === "custom" && !rule.custom_canonical_url?.trim()) {
      findings.push(
        finding({
          severity: "error",
          issue_type: "missing_canonical",
          route: rule.route_pattern,
          message: "Rule dùng canonical custom nhưng thiếu custom_canonical_url.",
          metadata: { rule_id: rule.id }
        })
      );
    }
  }

  try {
    const supabase = await createClient();

    const { data: posts } = await supabase
      .from("admin_content_posts")
      .select("id, slug, title, seo_title, seo_description, status, indexable")
      .eq("status", "published");

    const slugCounts = new Map<string, string[]>();
    for (const post of posts ?? []) {
      const slug = String(post.slug);
      const list = slugCounts.get(slug) ?? [];
      list.push(String(post.id));
      slugCounts.set(slug, list);

      if (!String(post.seo_title ?? "").trim()) {
        findings.push(
          finding({
            severity: "warning",
            issue_type: "missing_seo_title",
            route: `/bai-viet/${slug}`,
            message: "Bài viết published thiếu seo_title.",
            metadata: { post_id: post.id }
          })
        );
      }

      if (!String(post.seo_description ?? "").trim()) {
        findings.push(
          finding({
            severity: "warning",
            issue_type: "missing_seo_description",
            route: `/bai-viet/${slug}`,
            message: "Bài viết published thiếu seo_description.",
            metadata: { post_id: post.id }
          })
        );
      }

      const slugError = validateSeoSlug(slug);
      if (slugError) {
        findings.push(
          finding({
            severity: "error",
            issue_type: "invalid_slug",
            route: `/bai-viet/${slug}`,
            message: slugError,
            metadata: { post_id: post.id }
          })
        );
      }
    }

    for (const [slug, ids] of slugCounts) {
      if (ids.length > 1) {
        findings.push(
          finding({
            severity: "critical",
            issue_type: "duplicate_slug",
            route: `/bai-viet/${slug}`,
            message: `Slug "${slug}" trùng trên ${ids.length} bài viết.`,
            metadata: { post_ids: ids }
          })
        );
      }
    }

    const { data: stories } = await supabase
      .from("stories")
      .select("id, slug, title, hook, short_description, visibility, status")
      .eq("visibility", "public")
      .in("status", ["published", "approved"]);

    for (const story of stories ?? []) {
      const slug = String(story.slug);
      if (!isValidSeoSlug(slug)) {
        findings.push(
          finding({
            severity: "warning",
            issue_type: "invalid_slug",
            route: `/truyen/${slug}`,
            message: `Slug truyện không chuẩn SEO: "${slug}".`,
            metadata: { story_id: story.id }
          })
        );
      }

      const hasDescription =
        String(story.short_description ?? "").trim() || String(story.hook ?? "").trim();
      if (!hasDescription) {
        findings.push(
          finding({
            severity: "warning",
            issue_type: "missing_description",
            route: `/truyen/${slug}`,
            message: "Truyện published thiếu mô tả (short_description hoặc hook).",
            metadata: { story_id: story.id }
          })
        );
      }
    }

    const { data: episodes } = await supabase
      .from("episodes")
      .select("id, episode_number, stories!inner(slug, visibility, status)")
      .in("status", ["published", "approved"])
      .eq("stories.visibility", "public")
      .in("stories.status", ["published", "approved"])
      .limit(2000);

    for (const episode of episodes ?? []) {
      const story = Array.isArray(episode.stories) ? episode.stories[0] : episode.stories;
      if (!story?.slug) {
        continue;
      }

      const route = `/truyen/${story.slug}/chuong/${episode.episode_number}`;
      const pseudoSlug = `${story.slug}-chuong-${episode.episode_number}`;
      if (!isValidSeoSlug(pseudoSlug.split("-chuong-")[0] ?? "")) {
        findings.push(
          finding({
            severity: "warning",
            issue_type: "invalid_chapter_slug",
            route,
            message: `Chapter thuộc story slug không chuẩn SEO.`,
            metadata: { episode_id: episode.id, story_slug: story.slug }
          })
        );
      }
    }

    const { data: announcements } = await supabase
      .from("platform_announcements")
      .select("id, slug, title, indexable, status, visibility");

    for (const item of announcements ?? []) {
      if (item.indexable && item.status !== "published") {
        findings.push(
          finding({
            severity: "error",
            issue_type: "announcement_indexable_not_published",
            route: `/thong-bao/${item.slug}`,
            message: "Thông báo bật indexable nhưng chưa published.",
            metadata: { announcement_id: item.id, status: item.status }
          })
        );
      }

      const slugError = validateSeoSlug(String(item.slug));
      if (slugError) {
        findings.push(
          finding({
            severity: "warning",
            issue_type: "invalid_slug",
            route: `/thong-bao/${item.slug}`,
            message: slugError,
            metadata: { announcement_id: item.id }
          })
        );
      }
    }

    const taxonomyFindings = await runTaxonomySeoAuditFindings();
    findings.push(...taxonomyFindings);
  } catch (error) {
    return {
      rules,
      findings,
      error: error instanceof Error ? error.message : "Không thể chạy SEO audit."
    };
  }

  return { rules, findings, error: null };
}

export async function persistSeoAuditFindings(findings: SeoAuditFinding[]) {
  if (findings.length === 0) {
    return { error: null };
  }

  try {
    const supabase = await createClient();
    const rows = findings.slice(0, 50).map((item) => ({
      route: item.route,
      page_type: null,
      issue_type: item.issue_type,
      severity: item.severity,
      message: item.message,
      metadata: item.metadata ?? {}
    }));

    const { error } = await supabase.from("seo_audit_logs").insert(rows);
    return { error: error?.message ?? null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Không thể lưu audit log."
    };
  }
}
