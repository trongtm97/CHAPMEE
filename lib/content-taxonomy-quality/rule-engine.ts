import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  TaxonomyQualityDetectedBy,
  TaxonomyQualityFlagType,
  TaxonomyQualityRuleRow,
  TaxonomyQualitySeverity
} from "@/types/content-taxonomy-quality";
import type { TaxonomyTerm, TaxonomyType } from "@/types/taxonomy";

export type StoryTaxonomyCheckInput = {
  storyId: string;
  contentWarningsConfirmed: boolean;
  terms: TaxonomyTerm[];
  featuredTagCount: number;
  wrongTagReportCount: number;
  missingWarningReportCount: number;
  scheduledEpisodeCount: number;
  /** Latest discovery score (0–1). Omit when snapshot unavailable. */
  discoveryScore?: number | null;
  /** Aggregated taxonomy story metrics (recent window). */
  taxonomyImpressions?: number;
  taxonomyStarts?: number;
  taxonomyCompletes?: number;
};

export type DetectedTaxonomyFlag = {
  flagType: TaxonomyQualityFlagType;
  severity: TaxonomyQualitySeverity;
  reason: string;
  details: Record<string, unknown>;
  detectedBy: TaxonomyQualityDetectedBy;
};

export type RuleConfigMap = Record<string, TaxonomyQualityRuleRow>;

const DEFAULT_LIMITS: Record<string, number> = {
  max_subgenre: 3,
  max_trope_tag: 12,
  max_setting_tag: 5,
  max_character_tag: 5,
  max_relationship_tag: 3,
  max_reader_experience: 5,
  max_featured_tags: 5,
  report_threshold_wrong_tag: 3,
  report_threshold: 3
};

function countByType(terms: TaxonomyTerm[]) {
  const map = new Map<TaxonomyType, TaxonomyTerm[]>();
  for (const term of terms) {
    const list = map.get(term.type) ?? [];
    list.push(term);
    map.set(term.type, list);
  }
  return map;
}

function slugs(terms: TaxonomyTerm[]) {
  return terms.map((t) => t.slug);
}

function hasAnySlug(terms: TaxonomyTerm[], candidates: string[]) {
  const set = new Set(candidates);
  return terms.some((t) => set.has(t.slug));
}

function getConfigNumber(
  rules: RuleConfigMap,
  ruleKey: string,
  field: string,
  fallback: number
) {
  const rule = rules[ruleKey];
  const value = rule?.config?.[field];
  return typeof value === "number" ? value : fallback;
}

function getConfigStringArray(
  rules: RuleConfigMap,
  ruleKey: string,
  field: string,
  fallback: string[]
) {
  const rule = rules[ruleKey];
  const value = rule?.config?.[field];
  return Array.isArray(value) ? value.map(String) : fallback;
}

function getConfigBoolean(
  rules: RuleConfigMap,
  ruleKey: string,
  field: string,
  fallback: boolean
) {
  const rule = rules[ruleKey];
  const value = rule?.config?.[field];
  return typeof value === "boolean" ? value : fallback;
}

export function detectTaxonomyQualityFlags(
  input: StoryTaxonomyCheckInput,
  rules: RuleConfigMap
): DetectedTaxonomyFlag[] {
  const flags: DetectedTaxonomyFlag[] = [];
  const byType = countByType(input.terms);

  const missingRule = rules.missing_required;
  if (missingRule?.isEnabled !== false) {
    const requiredTypes = getConfigStringArray(
      rules,
      "missing_required",
      "required_types",
      ["content_type", "main_genre", "age_rating", "presentation_mode"]
    );
    const missing: string[] = [];
    for (const type of requiredTypes) {
      if ((byType.get(type as TaxonomyType)?.length ?? 0) < 1) {
        missing.push(type);
      }
    }
    const requireConfirm =
      rules.missing_required?.config?.require_warnings_confirmation !== false;
    if (requireConfirm && !input.contentWarningsConfirmed) {
      missing.push("content_warnings_confirmed");
    }
    if (missing.length > 0) {
      flags.push({
        flagType: "missing_required",
        severity: missingRule?.severity ?? "high",
        reason: `Thiếu phân loại bắt buộc: ${missing.join(", ")}.`,
        details: { missing },
        detectedBy: "system"
      });
    }
  }

  const tooManyRule = rules.too_many_tags;
  if (tooManyRule?.isEnabled !== false) {
    const checks: Array<{ type: TaxonomyType; configKey: string }> = [
      { type: "subgenre", configKey: "max_subgenre" },
      { type: "trope_tag", configKey: "max_trope_tag" },
      { type: "setting_tag", configKey: "max_setting_tag" },
      { type: "character_tag", configKey: "max_character_tag" },
      { type: "relationship_tag", configKey: "max_relationship_tag" },
      { type: "reader_experience", configKey: "max_reader_experience" }
    ];
    const exceeded: Array<{ type: string; count: number; max: number }> = [];
    for (const check of checks) {
      const count = byType.get(check.type)?.length ?? 0;
      const max = getConfigNumber(
        rules,
        "too_many_tags",
        check.configKey,
        DEFAULT_LIMITS[check.configKey] ?? 99
      );
      if (count > max) {
        exceeded.push({ type: check.type, count, max });
      }
    }
    if (exceeded.length > 0) {
      flags.push({
        flagType: "too_many_tags",
        severity: tooManyRule?.severity ?? "medium",
        reason: `Vượt giới hạn tag: ${exceeded.map((e) => `${e.type} (${e.count}/${e.max})`).join("; ")}.`,
        details: { exceeded },
        detectedBy: "system"
      });
    }
  }

  const hotRule = rules.hot_tag_abuse;
  if (hotRule?.isEnabled !== false) {
    const maxFeatured = getConfigNumber(
      rules,
      "hot_tag_abuse",
      "max_featured_tags",
      DEFAULT_LIMITS.max_featured_tags
    );
    const reportThreshold = getConfigNumber(
      rules,
      "hot_tag_abuse",
      "report_threshold_wrong_tag",
      DEFAULT_LIMITS.report_threshold_wrong_tag
    );
    if (input.featuredTagCount > maxFeatured) {
      flags.push({
        flagType: "hot_tag_abuse",
        severity: hotRule?.severity ?? "medium",
        reason: `Quá nhiều tag nổi bật (${input.featuredTagCount}/${maxFeatured}).`,
        details: { featuredTagCount: input.featuredTagCount, maxFeatured },
        detectedBy: "system"
      });
    } else if (input.wrongTagReportCount >= reportThreshold) {
      flags.push({
        flagType: "hot_tag_abuse",
        severity: hotRule?.severity ?? "medium",
        reason: `Tag bị report sai ${input.wrongTagReportCount} lần (ngưỡng ${reportThreshold}).`,
        details: {
          wrongTagReportCount: input.wrongTagReportCount,
          reportThreshold
        },
        detectedBy: "user_report"
      });
    } else {
      const minDiscovery = getConfigNumber(
        rules,
        "hot_tag_abuse",
        "min_discovery_score",
        -1
      );
      if (
        minDiscovery >= 0 &&
        input.featuredTagCount > 0 &&
        input.discoveryScore != null &&
        input.discoveryScore < minDiscovery
      ) {
        flags.push({
          flagType: "hot_tag_abuse",
          severity: hotRule?.severity ?? "medium",
          reason: `Tag nổi bật nhưng discovery score thấp (${input.discoveryScore.toFixed(2)} < ${minDiscovery}).`,
          details: {
            featuredTagCount: input.featuredTagCount,
            discoveryScore: input.discoveryScore,
            minDiscoveryScore: minDiscovery
          },
          detectedBy: "system"
        });
      }
    }
  }

  const conflictRule = rules.conflicting_taxonomy;
  if (conflictRule?.isEnabled !== false) {
    const conflicts: string[] = [];
    const ageTerms = byType.get("age_rating") ?? [];
    const warningTerms = byType.get("content_warning") ?? [];
    const contentTypeTerms = byType.get("content_type") ?? [];
    const presentationTerms = byType.get("presentation_mode") ?? [];
    const mainGenreTerms = byType.get("main_genre") ?? [];
    const relationshipTerms = byType.get("relationship_tag") ?? [];
    const statusTerms = byType.get("story_status") ?? [];

    const allAgesSlugs = getConfigStringArray(
      rules,
      "conflicting_taxonomy",
      "all_ages_slugs",
      ["all_ages"]
    );
    const severeWarnings = getConfigStringArray(
      rules,
      "conflicting_taxonomy",
      "severe_warning_slugs",
      [
        "bao-luc-nang",
        "tu-hai-tu-tu",
        "lam-dung",
        "cuong-ep-khong-dong-thuan",
        "noi-dung-nguoi-lon",
        "tinh-duc-ro-rang"
      ]
    );
    const childrenGenres = getConfigStringArray(
      rules,
      "conflicting_taxonomy",
      "children_genre_slugs",
      ["thieu-nhi"]
    );
    const poetryTypes = getConfigStringArray(
      rules,
      "conflicting_taxonomy",
      "poetry_content_type_slugs",
      ["tho"]
    );
    const systemGameModes = getConfigStringArray(
      rules,
      "conflicting_taxonomy",
      "system_game_presentation_slugs",
      ["system_game"]
    );
    const romanceSlugs = getConfigStringArray(
      rules,
      "conflicting_taxonomy",
      "romance_relationship_slugs",
      ["romance-chinh", "tinh-cam-chinh"]
    );

    if (
      hasAnySlug(ageTerms, allAgesSlugs) &&
      hasAnySlug(warningTerms, severeWarnings)
    ) {
      conflicts.push("age_rating_all_ages_with_severe_warning");
    }
    if (
      hasAnySlug(mainGenreTerms, childrenGenres) &&
      hasAnySlug(warningTerms, severeWarnings)
    ) {
      conflicts.push("children_genre_with_severe_warning");
    }
    if (
      hasAnySlug(contentTypeTerms, poetryTypes) &&
      hasAnySlug(presentationTerms, systemGameModes)
    ) {
      conflicts.push("poetry_with_system_game_presentation");
    }
    if (
      relationshipTerms.length > 0 &&
      hasAnySlug(relationshipTerms, romanceSlugs) &&
      !slugs(mainGenreTerms).some((s) => s.includes("tinh") || s.includes("romance"))
    ) {
      conflicts.push("romance_tag_without_romance_genre");
    }
    const completedStatus = statusTerms.some((t) =>
      ["hoan-thanh", "completed"].includes(t.slug)
    );
    if (completedStatus && input.scheduledEpisodeCount > 0) {
      conflicts.push("completed_with_scheduled_chapters");
    }

    if (conflicts.length > 0) {
      flags.push({
        flagType: "conflicting_taxonomy",
        severity: conflictRule?.severity ?? "high",
        reason: "Phát hiện mâu thuẫn phân loại taxonomy.",
        details: { conflicts },
        detectedBy: "system"
      });
    }
  }

  const missingWarningRule = rules.missing_warning;
  if (missingWarningRule?.isEnabled !== false) {
    const reportThreshold = getConfigNumber(
      rules,
      "missing_warning",
      "report_threshold",
      DEFAULT_LIMITS.report_threshold
    );
    const hasWarnings = (byType.get("content_warning")?.length ?? 0) > 0;
    if (
      !hasWarnings &&
      !input.contentWarningsConfirmed &&
      input.missingWarningReportCount >= reportThreshold
    ) {
      flags.push({
        flagType: "missing_warning",
        severity: missingWarningRule?.severity ?? "high",
        reason: `Nhiều report thiếu cảnh báo (${input.missingWarningReportCount}).`,
        details: {
          missingWarningReportCount: input.missingWarningReportCount,
          reportThreshold
        },
        detectedBy: "user_report"
      });
    }
  }

  const reportRule = rules.user_reported_wrong_tag;
  if (reportRule?.isEnabled !== false) {
    const reportThreshold = getConfigNumber(
      rules,
      "user_reported_wrong_tag",
      "report_threshold",
      DEFAULT_LIMITS.report_threshold
    );
    if (input.wrongTagReportCount >= reportThreshold) {
      const existing = flags.some((f) => f.flagType === "hot_tag_abuse");
      if (!existing) {
        flags.push({
          flagType: "user_reported_wrong_tag",
          severity: reportRule?.severity ?? "medium",
          reason: `Độc giả report sai tag ${input.wrongTagReportCount} lần.`,
          details: { wrongTagReportCount: input.wrongTagReportCount },
          detectedBy: "user_report"
        });
      }
    }
  }

  const behaviorRule = rules.taxonomy_behavior_mismatch;
  if (behaviorRule?.isEnabled !== false && getConfigBoolean(rules, "taxonomy_behavior_mismatch", "enabled", true)) {
    const bounceThreshold = getConfigNumber(
      rules,
      "taxonomy_behavior_mismatch",
      "bounce_threshold",
      0.85
    );
    const minImpressions = getConfigNumber(
      rules,
      "taxonomy_behavior_mismatch",
      "min_impressions",
      20
    );
    const impressions = input.taxonomyImpressions ?? 0;
    const starts = input.taxonomyStarts ?? 0;
    const startRate = impressions > 0 ? starts / impressions : 0;
    const bounceRate = 1 - startRate;

    if (impressions >= minImpressions && bounceRate >= bounceThreshold) {
      flags.push({
        flagType: "taxonomy_behavior_mismatch",
        severity: behaviorRule?.severity ?? "low",
        reason: `Hành vi đọc không khớp phân loại: ${impressions} impression nhưng chỉ ${starts} lượt bắt đầu đọc.`,
        details: {
          impressions,
          starts,
          completes: input.taxonomyCompletes ?? 0,
          bounceRate: Math.round(bounceRate * 1000) / 1000,
          bounceThreshold
        },
        detectedBy: "system"
      });
    }
  }

  return flags;
}

export async function loadTaxonomyQualityRules(
  supabase: SupabaseClient
): Promise<RuleConfigMap> {
  const { data, error } = await supabase
    .from("taxonomy_quality_rules")
    .select("*")
    .order("rule_key");

  if (error || !data) {
    return {};
  }

  const map: RuleConfigMap = {};
  for (const row of data) {
    map[String(row.rule_key)] = {
      id: String(row.id),
      ruleKey: String(row.rule_key),
      name: String(row.name),
      description: (row.description as string) ?? null,
      isEnabled: Boolean(row.is_enabled),
      severity: row.severity as TaxonomyQualitySeverity,
      config: (row.config_json as Record<string, unknown>) ?? {},
      updatedAt: String(row.updated_at)
    };
  }
  return map;
}

export async function upsertDetectedFlags(
  supabase: SupabaseClient,
  storyId: string,
  detected: DetectedTaxonomyFlag[]
) {
  for (const flag of detected) {
    const { data: existing } = await supabase
      .from("content_taxonomy_quality_flags")
      .select("id")
      .eq("story_id", storyId)
      .eq("flag_type", flag.flagType)
      .in("status", ["open", "reviewing", "sent_to_creator"])
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from("content_taxonomy_quality_flags")
        .update({
          severity: flag.severity,
          reason: flag.reason,
          details_json: flag.details,
          detected_by: flag.detectedBy,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("content_taxonomy_quality_flags").insert({
        story_id: storyId,
        flag_type: flag.flagType,
        severity: flag.severity,
        reason: flag.reason,
        details_json: flag.details,
        detected_by: flag.detectedBy,
        status: "open"
      });
    }
  }
}

/** Auto-resolve open system flags when re-check no longer detects the issue. */
export async function resolveStaleSystemFlags(
  supabase: SupabaseClient,
  storyId: string,
  detected: DetectedTaxonomyFlag[]
) {
  const activeTypes = new Set<string>(detected.map((f) => f.flagType));
  const { data: openFlags } = await supabase
    .from("content_taxonomy_quality_flags")
    .select("id, flag_type")
    .eq("story_id", storyId)
    .in("status", ["open", "reviewing"])
    .neq("flag_type", "admin_manual")
    .in("detected_by", ["system", "user_report", "import"]);

  const now = new Date().toISOString();
  for (const flag of openFlags ?? []) {
    if (!activeTypes.has(String(flag.flag_type))) {
      await supabase
        .from("content_taxonomy_quality_flags")
        .update({
          status: "resolved",
          resolved_at: now,
          updated_at: now
        })
        .eq("id", flag.id);
    }
  }
}

export async function runTaxonomyQualityCheckForStory(
  supabase: SupabaseClient,
  storyId: string,
  rules: RuleConfigMap
) {
  const { data: story } = await supabase
    .from("stories")
    .select("id, content_warnings_confirmed")
    .eq("id", storyId)
    .maybeSingle();

  if (!story) return { ok: false, error: "Story not found" };

  const { data: links } = await supabase
    .from("story_taxonomy_terms")
    .select("term_id")
    .eq("story_id", storyId);

  const termIds = (links ?? []).map((l) => String(l.term_id));
  let terms: TaxonomyTerm[] = [];
  if (termIds.length > 0) {
    const { data: termRows } = await supabase
      .from("taxonomy_terms")
      .select("*")
      .in("id", termIds);
    terms = (termRows ?? []) as TaxonomyTerm[];
  }

  const featuredTagCount = terms.filter((t) => t.is_featured).length;

  const taxonomyReportReasons = [
    "wrong_taxonomy_tag",
    "missing_content_warning",
    "wrong_age_rating"
  ] as const;

  const { count: wrongTagCount } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("target_type", "story")
    .eq("target_id", storyId)
    .in("reason_code", [...taxonomyReportReasons.filter((r) => r !== "missing_content_warning")])
    .in("status", ["pending", "reviewing", "escalated"]);

  const { count: missingWarningCount } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("target_type", "story")
    .eq("target_id", storyId)
    .eq("reason_code", "missing_content_warning")
    .in("status", ["pending", "reviewing", "escalated"]);

  const { count: scheduledCount } = await supabase
    .from("episodes")
    .select("id", { count: "exact", head: true })
    .eq("story_id", storyId)
    .eq("status", "scheduled");

  const { data: scoreRow } = await supabase
    .from("content_score_snapshots")
    .select("discovery_score")
    .eq("item_type", "story")
    .eq("item_id", storyId)
    .order("snapshot_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const metricsSince = new Date();
  metricsSince.setUTCDate(metricsSince.getUTCDate() - 14);
  const { data: storyMetrics } = await supabase
    .from("taxonomy_story_metrics")
    .select("impressions, starts, completes")
    .eq("story_id", storyId)
    .gte("date", metricsSince.toISOString().slice(0, 10));

  const taxonomyImpressions = (storyMetrics ?? []).reduce(
    (sum, row) => sum + Number(row.impressions ?? 0),
    0
  );
  const taxonomyStarts = (storyMetrics ?? []).reduce(
    (sum, row) => sum + Number(row.starts ?? 0),
    0
  );
  const taxonomyCompletes = (storyMetrics ?? []).reduce(
    (sum, row) => sum + Number(row.completes ?? 0),
    0
  );

  const detected = detectTaxonomyQualityFlags(
    {
      storyId,
      contentWarningsConfirmed: Boolean(story.content_warnings_confirmed),
      terms,
      featuredTagCount,
      wrongTagReportCount: wrongTagCount ?? 0,
      missingWarningReportCount: missingWarningCount ?? 0,
      scheduledEpisodeCount: scheduledCount ?? 0,
      discoveryScore:
        scoreRow?.discovery_score != null
          ? Number(scoreRow.discovery_score)
          : null,
      taxonomyImpressions,
      taxonomyStarts,
      taxonomyCompletes
    },
    rules
  );

  await upsertDetectedFlags(supabase, storyId, detected);
  await resolveStaleSystemFlags(supabase, storyId, detected);
  return { ok: true, flagsCreated: detected.length };
}

export async function runTaxonomyQualityBatchCheck(
  supabase: SupabaseClient,
  options?: { limit?: number; offset?: number }
) {
  const limit = options?.limit ?? 200;
  const offset = options?.offset ?? 0;
  const rules = await loadTaxonomyQualityRules(supabase);

  const { data: stories, error } = await supabase
    .from("stories")
    .select("id")
    .in("status", ["published", "approved"])
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return { ok: false, error: error.message, processed: 0, nextOffset: offset };
  }

  const { count: totalStories } = await supabase
    .from("stories")
    .select("id", { count: "exact", head: true })
    .in("status", ["published", "approved"]);

  let processed = 0;
  for (const story of stories ?? []) {
    await runTaxonomyQualityCheckForStory(supabase, String(story.id), rules);
    processed += 1;
  }

  const total = totalStories ?? 0;
  const nextOffset =
    processed === 0 || offset + processed >= total ? 0 : offset + limit;

  return {
    ok: true,
    processed,
    totalStories: total,
    nextOffset,
    error: null
  };
}
