import { createAdminClient } from "@/lib/data/admin";
import {
  buildPaginatedResult,
  clampPage,
  normalizePageSize
} from "@/lib/shared/pagination";
import type {
  CreatorTaxonomyRevisionRequestRow,
  TaxonomyQualityAdminTab,
  TaxonomyQualityFilterOptions,
  TaxonomyQualityFlagFilters,
  TaxonomyQualityFlagRow,
  TaxonomyQualityPageData,
  TaxonomyQualityRuleRow,
  TaxonomyQualitySummary
} from "@/types/content-taxonomy-quality";

function tabToFlagTypes(tab: TaxonomyQualityAdminTab): string[] | null {
  switch (tab) {
    case "missing_warnings":
      return ["missing_warning"];
    case "import_errors":
      return ["import_error"];
    case "hot_tags":
      return ["hot_tag_abuse", "user_reported_wrong_tag"];
    case "stories":
      return null;
    default:
      return null;
  }
}

function relOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapRules(rows: Array<Record<string, unknown>>): TaxonomyQualityRuleRow[] {
  return rows.map((row) => ({
    id: String(row.id),
    ruleKey: String(row.rule_key),
    name: String(row.name),
    description: (row.description as string) ?? null,
    isEnabled: Boolean(row.is_enabled),
    severity: row.severity as TaxonomyQualityRuleRow["severity"],
    config: (row.config_json as Record<string, unknown>) ?? {},
    updatedAt: String(row.updated_at)
  }));
}

async function loadFilterOptions(
  db: ReturnType<typeof createAdminClient>
): Promise<TaxonomyQualityFilterOptions> {
  const [{ data: genres }, { data: jobs }] = await Promise.all([
    db
      .from("taxonomy_terms")
      .select("slug, name")
      .eq("type", "main_genre")
      .eq("is_active", true)
      .order("name")
      .limit(100),
    db
      .from("studio_import_export_jobs")
      .select("id, file_name, created_at, job_type")
      .eq("job_type", "import_stories")
      .order("created_at", { ascending: false })
      .limit(20)
  ]);

  return {
    mainGenres: (genres ?? []).map((g) => ({
      slug: String(g.slug),
      name: String(g.name)
    })),
    recentImportJobs: (jobs ?? []).map((job) => ({
      id: String(job.id),
      label: `${job.file_name ?? "import"} · ${String(job.created_at).slice(0, 10)}`
    }))
  };
}

function emptyPageData(
  page: number,
  pageSize: number,
  summary: TaxonomyQualitySummary,
  rules: TaxonomyQualityRuleRow[],
  filterOptions: TaxonomyQualityFilterOptions
): TaxonomyQualityPageData {
  return {
    summary,
    flags: [],
    flagsTotal: 0,
    page,
    pageSize,
    totalPages: 1,
    rules,
    revisionRequests: [],
    revisionRequestsTotal: 0,
    hotTagAbuse: [],
    filterOptions,
    error: null
  };
}

export async function getContentTaxonomyQualityPageData(
  filters: TaxonomyQualityFlagFilters = {}
): Promise<TaxonomyQualityPageData> {
  const page = clampPage(filters.page);
  const pageSize = normalizePageSize(filters.pageSize, [20, 40, 60]);
  const tab = filters.tab ?? "overview";
  const offset = (page - 1) * pageSize;

  try {
    const db = createAdminClient();

    const filterOptions = await loadFilterOptions(db);

    const [
      missingRequired,
      wrongGenre,
      tagAbuse,
      missingWarning,
      userReported,
      openRevisionRequests,
      rulesResult
    ] = await Promise.all([
      db
        .from("content_taxonomy_quality_flags")
        .select("id", { count: "exact", head: true })
        .eq("flag_type", "missing_required")
        .in("status", ["open", "reviewing", "sent_to_creator"]),
      db
        .from("content_taxonomy_quality_flags")
        .select("id", { count: "exact", head: true })
        .eq("flag_type", "conflicting_taxonomy")
        .in("status", ["open", "reviewing", "sent_to_creator"]),
      db
        .from("content_taxonomy_quality_flags")
        .select("id", { count: "exact", head: true })
        .in("flag_type", ["hot_tag_abuse", "too_many_tags"])
        .in("status", ["open", "reviewing", "sent_to_creator"]),
      db
        .from("content_taxonomy_quality_flags")
        .select("id", { count: "exact", head: true })
        .eq("flag_type", "missing_warning")
        .in("status", ["open", "reviewing", "sent_to_creator"]),
      db
        .from("content_taxonomy_quality_flags")
        .select("id", { count: "exact", head: true })
        .eq("flag_type", "user_reported_wrong_tag")
        .in("status", ["open", "reviewing", "sent_to_creator"]),
      db
        .from("creator_taxonomy_revision_requests")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "creator_submitted"]),
      db.from("taxonomy_quality_rules").select("*").order("rule_key")
    ]);

    const { data: featuredTerms } = await db
      .from("taxonomy_terms")
      .select("id, name, slug, usage_count, is_featured")
      .eq("is_featured", true)
      .order("usage_count", { ascending: false })
      .limit(20);

    const abnormalUsage =
      (featuredTerms ?? []).filter((t) => Number(t.usage_count ?? 0) > 500).length;

    const summary: TaxonomyQualitySummary = {
      missingRequired: missingRequired.count ?? 0,
      wrongGenre: wrongGenre.count ?? 0,
      tagAbuse: tagAbuse.count ?? 0,
      missingWarning: missingWarning.count ?? 0,
      userReported: userReported.count ?? 0,
      abnormalUsage,
      openRevisionRequests: openRevisionRequests.count ?? 0
    };

    let flagsQuery = db
      .from("content_taxonomy_quality_flags")
      .select(
        "id, story_id, flag_type, severity, status, reason, details_json, detected_by, created_at, updated_at, stories!inner(id, title, slug, creator_id, content_warnings_confirmed)",
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    const tabTypes = tabToFlagTypes(tab);
    if (tabTypes) {
      flagsQuery = flagsQuery.in("flag_type", tabTypes);
    }
    if (filters.flagType && filters.flagType !== "all") {
      flagsQuery = flagsQuery.eq("flag_type", filters.flagType);
    }
    if (filters.severity && filters.severity !== "all") {
      flagsQuery = flagsQuery.eq("severity", filters.severity);
    }
    if (filters.status && filters.status !== "all") {
      flagsQuery = flagsQuery.eq("status", filters.status);
    } else if (tab === "stories" || tab === "overview") {
      flagsQuery = flagsQuery.in("status", [
        "open",
        "reviewing",
        "sent_to_creator"
      ]);
    }
    if (filters.hasUserReports) {
      flagsQuery = flagsQuery.in("detected_by", ["user_report"]);
    }
    if (filters.importJobId) {
      flagsQuery = flagsQuery.contains("details_json", {
        importJobId: filters.importJobId
      });
    }

    let scopedStoryIds: string[] | null = null;

    if (filters.author?.trim()) {
      const q = filters.author.trim();
      const { data: profiles } = await db
        .from("profiles")
        .select("id")
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .limit(50);
      const creatorIds = (profiles ?? []).map((p) => String(p.id));
      if (creatorIds.length === 0) {
        scopedStoryIds = [];
      } else {
        const { data: authorStories } = await db
          .from("stories")
          .select("id")
          .in("creator_id", creatorIds);
        scopedStoryIds = (authorStories ?? []).map((s) => String(s.id));
      }
    }

    if (filters.mainGenre?.trim()) {
      const { data: genreTerm } = await db
        .from("taxonomy_terms")
        .select("id")
        .eq("type", "main_genre")
        .eq("slug", filters.mainGenre.trim())
        .maybeSingle();
      if (!genreTerm?.id) {
        scopedStoryIds = [];
      } else {
        const { data: genreLinks } = await db
          .from("story_taxonomy_terms")
          .select("story_id")
          .eq("term_id", genreTerm.id)
          .eq("type", "main_genre");
        const genreStoryIds = (genreLinks ?? []).map((l) => String(l.story_id));
        scopedStoryIds =
          scopedStoryIds == null
            ? genreStoryIds
            : scopedStoryIds.filter((id) => genreStoryIds.includes(id));
      }
    }

    if (scopedStoryIds != null) {
      if (scopedStoryIds.length === 0) {
        return emptyPageData(
          page,
          pageSize,
          summary,
          mapRules(rulesResult.data ?? []),
          filterOptions
        );
      }
      flagsQuery = flagsQuery.in("story_id", scopedStoryIds);
    }

    const { data: flagRows, count: flagsTotal, error: flagsError } = await flagsQuery.range(
      offset,
      offset + pageSize - 1
    );

    if (flagsError) throw flagsError;

    const storyIds = (flagRows ?? []).map((r) => String(r.story_id));
    const creatorIds = [
      ...new Set(
        (flagRows ?? []).map((r) => {
          const story = relOne(r.stories as { creator_id: string } | { creator_id: string }[]);
          return story ? String(story.creator_id) : "";
        }).filter(Boolean)
      )
    ];
    const authorNames = new Map<string, string>();
    if (creatorIds.length > 0) {
      const { data: profiles } = await db
        .from("profiles")
        .select("id, display_name, username")
        .in("id", creatorIds);
      for (const profile of profiles ?? []) {
        authorNames.set(
          String(profile.id),
          profile.display_name?.trim() || profile.username?.trim() || "—"
        );
      }
    }

    const taxonomyByStory = new Map<
      string,
      { mainGenre: string | null; tagCount: number; ageRating: string | null }
    >();

    if (storyIds.length > 0) {
      const { data: links } = await db
        .from("story_taxonomy_terms")
        .select("story_id, type, taxonomy_terms(name, slug)")
        .in("story_id", storyIds);

      for (const link of links ?? []) {
        const storyId = String(link.story_id);
        const current = taxonomyByStory.get(storyId) ?? {
          mainGenre: null,
          tagCount: 0,
          ageRating: null
        };
        current.tagCount += 1;
        const term = relOne(
          link.taxonomy_terms as
            | { name: string; slug: string }
            | Array<{ name: string; slug: string }>
        );
        if (link.type === "main_genre" && term) {
          current.mainGenre = term.name;
        }
        if (link.type === "age_rating" && term) {
          current.ageRating = term.name;
        }
        taxonomyByStory.set(storyId, current);
      }
    }

    const reportCounts = new Map<string, number>();
    if (storyIds.length > 0) {
      const { data: reports } = await db
        .from("reports")
        .select("target_id")
        .eq("target_type", "story")
        .in("target_id", storyIds)
        .in("reason_code", [
          "wrong_taxonomy_tag",
          "missing_content_warning",
          "wrong_age_rating"
        ])
        .in("status", ["pending", "reviewing", "escalated"]);

      for (const report of reports ?? []) {
        const id = String(report.target_id);
        reportCounts.set(id, (reportCounts.get(id) ?? 0) + 1);
      }
    }

    const flags: TaxonomyQualityFlagRow[] = (flagRows ?? []).map((row) => {
      const story = relOne(
        row.stories as
          | {
              id: string;
              title: string;
              slug: string;
              creator_id: string;
              content_warnings_confirmed: boolean;
            }
          | Array<{
              id: string;
              title: string;
              slug: string;
              creator_id: string;
              content_warnings_confirmed: boolean;
            }>
      );
      if (!story) {
        throw new Error("Missing story relation on taxonomy quality flag");
      }
      const tax = taxonomyByStory.get(String(row.story_id));
      return {
        id: String(row.id),
        storyId: String(row.story_id),
        storyTitle: story.title,
        storySlug: story.slug,
        authorId: String(story.creator_id),
        authorName: authorNames.get(String(story.creator_id)) ?? "—",
        mainGenre: tax?.mainGenre ?? null,
        tagCount: tax?.tagCount ?? 0,
        ageRating: tax?.ageRating ?? null,
        warningStatus: story.content_warnings_confirmed
          ? "Đã xác nhận"
          : "Chưa xác nhận",
        flagType: row.flag_type,
        severity: row.severity,
        status: row.status,
        reason: row.reason,
        details: (row.details_json as Record<string, unknown>) ?? {},
        detectedBy: row.detected_by,
        userReportCount: reportCounts.get(String(row.story_id)) ?? 0,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at)
      };
    });

    const rules = mapRules(rulesResult.data ?? []);

    const { data: revisionRows, count: revisionTotal } = await db
      .from("creator_taxonomy_revision_requests")
      .select(
        "id, story_id, creator_id, reason, required_changes_json, status, due_at, creator_note, creator_submitted_at, created_at, stories!inner(title, slug)",
        { count: "exact" }
      )
      .in("status", ["open", "creator_submitted"])
      .order("created_at", { ascending: false })
      .limit(20);

    const revisionRequests: CreatorTaxonomyRevisionRequestRow[] = (
      revisionRows ?? []
    )
      .map((row) => {
        const story = relOne(
          row.stories as
            | { title: string; slug: string }
            | Array<{ title: string; slug: string }>
        );
        if (!story) return null;
        return {
          id: String(row.id),
          storyId: String(row.story_id),
          storyTitle: story.title,
          storySlug: story.slug,
          creatorId: String(row.creator_id),
          reason: row.reason,
          requiredChanges: (row.required_changes_json as Record<string, unknown>) ?? {},
          status: row.status as CreatorTaxonomyRevisionRequestRow["status"],
          dueAt: row.due_at ? String(row.due_at) : null,
          creatorNote: (row.creator_note as string | null) ?? null,
          creatorSubmittedAt: row.creator_submitted_at
            ? String(row.creator_submitted_at)
            : null,
          createdAt: String(row.created_at)
        };
      })
      .filter((row): row is CreatorTaxonomyRevisionRequestRow => row != null);

    const hotTagAbuse = await Promise.all(
      (featuredTerms ?? []).slice(0, 10).map(async (term) => {
        const { count } = await db
          .from("reports")
          .select("id", { count: "exact", head: true })
          .contains("metadata", { reported_term_slug: term.slug });
        return {
          termId: String(term.id),
          termName: String(term.name),
          termSlug: String(term.slug),
          storyCount: Number(term.usage_count ?? 0),
          featured: Boolean(term.is_featured),
          reportCount: count ?? 0
        };
      })
    );

    const paginated = buildPaginatedResult(flags, flagsTotal ?? 0, page, pageSize);

    return {
      summary,
      flags: paginated.items,
      flagsTotal: paginated.total_count,
      page: paginated.page,
      pageSize: paginated.page_size,
      totalPages: paginated.total_pages,
      rules,
      revisionRequests,
      revisionRequestsTotal: revisionTotal ?? 0,
      hotTagAbuse,
      filterOptions,
      error: null
    };
  } catch (error) {
    return {
      summary: {
        missingRequired: 0,
        wrongGenre: 0,
        tagAbuse: 0,
        missingWarning: 0,
        userReported: 0,
        abnormalUsage: 0,
        openRevisionRequests: 0
      },
      flags: [],
      flagsTotal: 0,
      page: 1,
      pageSize: 20,
      totalPages: 1,
      rules: [],
      revisionRequests: [],
      revisionRequestsTotal: 0,
      hotTagAbuse: [],
      filterOptions: { mainGenres: [], recentImportJobs: [] },
      error: error instanceof Error ? error.message : "Không tải được dữ liệu."
    };
  }
}

export async function getAdminStoryTaxonomyEditBundle(storyId: string) {
  const { getStoryFormTaxonomyBundle } = await import(
    "@/lib/creator/get-story-form-taxonomy"
  );
  const db = createAdminClient();
  const { data: story } = await db
    .from("stories")
    .select("id, title, slug, content_warnings_confirmed")
    .eq("id", storyId)
    .maybeSingle();

  if (!story) {
    return { ok: false as const, error: "Không tìm thấy truyện." };
  }

  const taxonomy = await getStoryFormTaxonomyBundle(storyId, {
    contentWarningsConfirmed: Boolean(story.content_warnings_confirmed)
  });

  return {
    ok: true as const,
    story: {
      id: String(story.id),
      title: String(story.title),
      slug: String(story.slug),
      contentWarningsConfirmed: Boolean(story.content_warnings_confirmed)
    },
    taxonomy
  };
}
