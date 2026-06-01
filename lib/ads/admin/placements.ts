import { createAdminClient } from "@/lib/supabase/admin";
import { logAdPlacementAudit } from "@/lib/ads/ad-placement-audit";
import { mapPlacementRow } from "@/lib/ads/map-placement-row";
import { getPlacementRiskLevel } from "@/lib/ads/placement-risk";
import type {
  AdPlacementFormInput,
  AdPlacementListFilters,
  AdPlacementListItem,
  AdPlacementRevenuePrep,
  AdPlacementRow,
  AdPlacementStats
} from "@/types/ads";

const PAGE_SIZE_DEFAULT = 20;

function todayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function buildInsertPayload(input: AdPlacementFormInput, actorId?: string) {
  return {
    placement_key: input.placement_key.trim(),
    name: input.name.trim(),
    description: input.description ?? null,
    surface: input.surface,
    page_pattern: input.page_pattern ?? null,
    device: input.device,
    position: input.position,
    ad_format: input.ad_format,
    size_mode: input.size_mode,
    width: input.width ?? null,
    height: input.height ?? null,
    max_width: input.max_width ?? null,
    min_height: input.min_height ?? null,
    adsense_slot_id: input.adsense_slot_id ?? null,
    adsense_client_id: input.adsense_client_id ?? null,
    is_enabled: input.is_enabled ?? false,
    is_test_mode: input.is_test_mode ?? true,
    priority: input.priority ?? 100,
    max_per_page: input.max_per_page ?? 1,
    min_content_gap: input.min_content_gap ?? input.min_paragraphs_before ?? 0,
    max_ads_per_chapter: input.max_ads_per_chapter ?? 2,
    min_paragraphs_before: input.min_paragraphs_before ?? input.min_content_gap ?? 0,
    min_paragraphs_after: input.min_paragraphs_after ?? 0,
    min_distance_px: input.min_distance_px ?? 800,
    feed_cooldown_items: input.feed_cooldown_items ?? null,
    show_label: input.show_label ?? true,
    lazy_load: input.lazy_load ?? true,
    reserve_space: input.reserve_space ?? true,
    sticky_allowed: input.sticky_allowed ?? false,
    hide_for_vip: input.hide_for_vip ?? false,
    hide_for_owner: input.hide_for_owner ?? true,
    hide_on_sensitive_content: input.hide_on_sensitive_content ?? true,
    no_ads_respect: input.no_ads_respect ?? true,
    full_width_responsive: input.full_width_responsive ?? true,
    fallback_text: input.fallback_text ?? null,
    revenue_eligible: input.revenue_eligible ?? false,
    attribution_mode: input.attribution_mode ?? "platform_only",
    revenue_bucket: input.revenue_bucket ?? "platform_ads",
    frequency_rule: input.frequency_rule ?? {},
    excluded_routes: input.excluded_routes ?? [],
    allowed_roles: input.allowed_roles ?? [],
    notes: input.notes ?? null,
    internal_note: input.internal_note ?? null,
    created_by: actorId ?? null,
    updated_by: actorId ?? null
  };
}

function applyListFilters<T extends { eq: (col: string, val: unknown) => T; is: (col: string, val: null) => T; or: (filter: string) => T; ilike: (col: string, val: string) => T }>(
  query: T,
  filters: AdPlacementListFilters
): T {
  let q = query;
  if (!filters.includeArchived) {
    q = q.is("archived_at", null);
  }
  if (filters.surface) q = q.eq("surface", filters.surface);
  if (filters.device) q = q.eq("device", filters.device);
  if (filters.enabled === "yes") q = q.eq("is_enabled", true);
  else if (filters.enabled === "no") q = q.eq("is_enabled", false);
  if (filters.testMode === "yes") q = q.eq("is_test_mode", true);
  else if (filters.testMode === "no") q = q.eq("is_test_mode", false);
  if (filters.mode === "live") {
    q = q.eq("is_test_mode", false).eq("is_enabled", true);
  } else if (filters.mode === "test") {
    q = q.eq("is_test_mode", true);
  }
  if (filters.adFormat) q = q.eq("ad_format", filters.adFormat);
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    q = q.or(`placement_key.ilike.${term},name.ilike.${term},surface.ilike.${term}`);
  }
  return q;
}

async function attachTodayStats(items: AdPlacementRow[]): Promise<AdPlacementListItem[]> {
  if (items.length === 0) return [];
  const supabase = createAdminClient();
  const date = todayDateKey();
  const keys = items.map((i) => i.placement_key);

  const { data: statsRows } = await supabase
    .from("ad_daily_stats")
    .select("placement_key, renders, impressions, clicks, estimated_revenue")
    .eq("stat_date", date)
    .in("placement_key", keys);

  const statsMap = new Map<string, { renders: number; impressions: number; clicks: number; estimated_revenue: number }>();
  for (const row of statsRows ?? []) {
    const key = String(row.placement_key);
    const prev = statsMap.get(key) ?? { renders: 0, impressions: 0, clicks: 0, estimated_revenue: 0 };
    statsMap.set(key, {
      renders: prev.renders + Number(row.renders ?? 0),
      impressions: prev.impressions + Number(row.impressions ?? 0),
      clicks: prev.clicks + Number(row.clicks ?? 0),
      estimated_revenue: prev.estimated_revenue + Number(row.estimated_revenue ?? 0)
    });
  }

  return items.map((item) => {
    const raw = statsMap.get(item.placement_key);
    const stats_today = raw
      ? {
          renders: raw.renders,
          impressions: raw.impressions,
          clicks: raw.clicks,
          estimated_revenue: raw.estimated_revenue,
          ctr: raw.impressions > 0 ? (raw.clicks / raw.impressions) * 100 : 0
        }
      : null;
    return {
      ...item,
      stats_today,
      risk_level: getPlacementRiskLevel(item, items)
    };
  });
}

function filterByRisk(items: AdPlacementListItem[], risk?: AdPlacementListFilters["risk"]) {
  if (!risk || risk === "all") return items;
  return items.filter((i) => i.risk_level === risk);
}

export async function listAdPlacementsAdmin(filters: AdPlacementListFilters = {}): Promise<{
  items: AdPlacementListItem[];
  total: number;
  error: string | null;
}> {
  try {
    const supabase = createAdminClient();
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? PAGE_SIZE_DEFAULT));

    let countQuery = supabase.from("ad_placements").select("id", { count: "exact", head: true });
    countQuery = applyListFilters(countQuery, filters);
    const { count, error: countError } = await countQuery;
    if (countError) {
      return { items: [], total: 0, error: countError.message };
    }

    const needsRiskFilter = filters.risk && filters.risk !== "all";
    const fetchSize = needsRiskFilter ? 500 : pageSize;
    const from = needsRiskFilter ? 0 : (page - 1) * pageSize;
    const to = needsRiskFilter ? fetchSize - 1 : from + pageSize - 1;

    let dataQuery = supabase
      .from("ad_placements")
      .select("*")
      .order("surface", { ascending: true })
      .order("priority", { ascending: true })
      .order("placement_key", { ascending: true })
      .range(from, to);
    dataQuery = applyListFilters(dataQuery, filters);

    const { data, error } = await dataQuery;
    if (error) {
      return { items: [], total: 0, error: error.message };
    }

    const rows = (data ?? []).map((r) => mapPlacementRow(r as Record<string, unknown>));
    let items = await attachTodayStats(rows);
    items = filterByRisk(items, filters.risk);

    if (needsRiskFilter) {
      const filteredTotal = items.length;
      const pageStart = (page - 1) * pageSize;
      return {
        items: items.slice(pageStart, pageStart + pageSize),
        total: filteredTotal,
        error: null
      };
    }

    return { items, total: count ?? 0, error: null };
  } catch {
    return { items: [], total: 0, error: "Không tải được danh sách placement." };
  }
}

export async function getAdPlacementStatsAdmin(): Promise<{
  stats: AdPlacementStats;
  error: string | null;
}> {
  try {
    const supabase = createAdminClient();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const dateKey = todayDateKey();

    const [allRes, enabledRes, testRes, eventsRes, dailyRes, allRowsRes] = await Promise.all([
      supabase.from("ad_placements").select("id", { count: "exact", head: true }).is("archived_at", null),
      supabase
        .from("ad_placements")
        .select("id", { count: "exact", head: true })
        .eq("is_enabled", true)
        .is("archived_at", null),
      supabase
        .from("ad_placements")
        .select("id", { count: "exact", head: true })
        .eq("is_test_mode", true)
        .is("archived_at", null),
      supabase
        .from("ad_render_events")
        .select("id", { count: "exact", head: true })
        .eq("event_type", "rendered")
        .gte("created_at", startOfDay.toISOString()),
      supabase.from("ad_daily_stats").select("renders, impressions, clicks, estimated_revenue").eq("stat_date", dateKey),
      supabase.from("ad_placements").select("*").is("archived_at", null)
    ]);

    const dailyTotals = (dailyRes.data ?? []).reduce(
      (acc, row) => ({
        renders: acc.renders + Number(row.renders ?? 0),
        impressions: acc.impressions + Number(row.impressions ?? 0),
        clicks: acc.clicks + Number(row.clicks ?? 0),
        estimated_revenue: acc.estimated_revenue + Number(row.estimated_revenue ?? 0)
      }),
      { renders: 0, impressions: 0, clicks: 0, estimated_revenue: 0 }
    );

    const statsAvailable = !dailyRes.error;
    const allRows = (allRowsRes.data ?? []).map((r) => mapPlacementRow(r as Record<string, unknown>));
    const warningPlacementCount = allRows.filter(
      (row) => getPlacementRiskLevel(row, allRows) !== "ok"
    ).length;

    return {
      stats: {
        totalPlacements: allRes.count ?? 0,
        enabledCount: enabledRes.count ?? 0,
        testModeCount: testRes.count ?? 0,
        renderedToday: statsAvailable
          ? dailyTotals.renders
          : eventsRes.count ?? 0,
        impressionsToday: dailyTotals.impressions,
        clicksToday: dailyTotals.clicks,
        estimatedRevenueToday: dailyTotals.estimated_revenue,
        warningPlacementCount,
        statsAvailable
      },
      error: null
    };
  } catch {
    return {
      stats: {
        totalPlacements: 0,
        enabledCount: 0,
        testModeCount: 0,
        renderedToday: 0,
        impressionsToday: 0,
        clicksToday: 0,
        estimatedRevenueToday: 0,
        warningPlacementCount: 0,
        statsAvailable: false
      },
      error: "Không tải được thống kê quảng cáo."
    };
  }
}

export async function getAdPlacementRevenuePrepAdmin(): Promise<{
  prep: AdPlacementRevenuePrep;
  error: string | null;
}> {
  try {
    const supabase = createAdminClient();
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthKey = monthStart.toISOString().slice(0, 10);

    const [placementsRes, monthStatsRes] = await Promise.all([
      supabase
        .from("ad_placements")
        .select("revenue_eligible, attribution_mode")
        .is("archived_at", null),
      supabase
        .from("ad_daily_stats")
        .select("estimated_revenue")
        .gte("stat_date", monthKey)
    ]);

    const placements = placementsRes.data ?? [];
    let revenueEligibleCount = 0;
    let platformOnlyCount = 0;
    let authorAttributedCount = 0;
    for (const p of placements) {
      if (p.revenue_eligible) revenueEligibleCount += 1;
      if (p.attribution_mode === "platform_only") platformOnlyCount += 1;
      if (p.attribution_mode === "page_owner_author" || p.attribution_mode === "mixed") {
        authorAttributedCount += 1;
      }
    }

    const monthEstimatedRevenueVnd = (monthStatsRes.data ?? []).reduce(
      (sum, row) => sum + Number(row.estimated_revenue ?? 0),
      0
    );

    return {
      prep: {
        monthEstimatedRevenueVnd,
        revenueEligibleCount,
        platformOnlyCount,
        authorAttributedCount,
        statsAvailable: !monthStatsRes.error
      },
      error: null
    };
  } catch {
    return {
      prep: {
        monthEstimatedRevenueVnd: 0,
        revenueEligibleCount: 0,
        platformOnlyCount: 0,
        authorAttributedCount: 0,
        statsAvailable: false
      },
      error: null
    };
  }
}

export async function getAdPlacementByIdAdmin(id: string): Promise<{
  item: AdPlacementRow | null;
  error: string | null;
}> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("ad_placements").select("*").eq("id", id).maybeSingle();
    if (error) return { item: null, error: error.message };
    return { item: data ? mapPlacementRow(data as Record<string, unknown>) : null, error: null };
  } catch {
    return { item: null, error: "Không tải được placement." };
  }
}

export async function createAdPlacementAdmin(
  input: AdPlacementFormInput,
  actorId?: string
): Promise<{ item: AdPlacementRow | null; error: string | null }> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("ad_placements")
      .insert(buildInsertPayload(input, actorId))
      .select("*")
      .single();

    if (error) return { item: null, error: error.message };
    const item = mapPlacementRow(data as Record<string, unknown>);
    if (actorId) {
      await logAdPlacementAudit({
        actorId,
        action: "ad_placement.create",
        placementId: item.id,
        placementKey: item.placement_key,
        metadata: { after: item }
      });
    }
    return { item, error: null };
  } catch {
    return { item: null, error: "Không tạo được placement." };
  }
}

export async function updateAdPlacementAdmin(
  id: string,
  input: Partial<AdPlacementFormInput>,
  actorId?: string
): Promise<{ item: AdPlacementRow | null; error: string | null }> {
  try {
    const beforeRes = actorId ? await getAdPlacementByIdAdmin(id) : { item: null };
    const supabase = createAdminClient();
    const patch: Record<string, unknown> = { updated_by: actorId ?? undefined };

    const fields: (keyof AdPlacementFormInput)[] = [
      "placement_key",
      "name",
      "description",
      "surface",
      "page_pattern",
      "device",
      "position",
      "ad_format",
      "size_mode",
      "width",
      "height",
      "max_width",
      "min_height",
      "adsense_slot_id",
      "adsense_client_id",
      "is_enabled",
      "is_test_mode",
      "priority",
      "max_per_page",
      "min_content_gap",
      "max_ads_per_chapter",
      "min_paragraphs_before",
      "min_paragraphs_after",
      "min_distance_px",
      "feed_cooldown_items",
      "show_label",
      "lazy_load",
      "reserve_space",
      "sticky_allowed",
      "hide_for_vip",
      "hide_for_owner",
      "hide_on_sensitive_content",
      "no_ads_respect",
      "full_width_responsive",
      "fallback_text",
      "revenue_eligible",
      "attribution_mode",
      "revenue_bucket",
      "frequency_rule",
      "excluded_routes",
      "allowed_roles",
      "notes",
      "internal_note"
    ];

    for (const key of fields) {
      if (input[key] !== undefined) {
        patch[key] = key === "placement_key" || key === "name" ? String(input[key]).trim() : input[key];
      }
    }

    const { data, error } = await supabase
      .from("ad_placements")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error) return { item: null, error: error.message };
    const item = mapPlacementRow(data as Record<string, unknown>);

    if (actorId) {
      const action =
        input.is_enabled === true
          ? "ad_placement.enable"
          : input.is_enabled === false
            ? "ad_placement.disable"
            : input.is_test_mode === true
              ? "ad_placement.test_mode"
              : input.is_test_mode === false
                ? "ad_placement.live_mode"
                : input.adsense_slot_id !== undefined || input.adsense_client_id !== undefined
                  ? "ad_placement.adsense_update"
                  : "ad_placement.update";

      await logAdPlacementAudit({
        actorId,
        action,
        placementId: item.id,
        placementKey: item.placement_key,
        metadata: { before: beforeRes.item, after: item }
      });
    }

    return { item, error: null };
  } catch {
    return { item: null, error: "Không cập nhật được placement." };
  }
}

export async function toggleAdPlacementAdmin(
  id: string,
  isEnabled: boolean,
  actorId?: string
): Promise<{ error: string | null }> {
  const result = await updateAdPlacementAdmin(id, { is_enabled: isEnabled }, actorId);
  return { error: result.error };
}

export async function archiveAdPlacementAdmin(
  id: string,
  actorId?: string
): Promise<{ error: string | null }> {
  try {
    const { item: placement } = await getAdPlacementByIdAdmin(id);
    if (!placement) {
      return { error: "Không tìm thấy placement." };
    }

    const supabase = createAdminClient();
    const { count: statsCount } = await supabase
      .from("ad_daily_stats")
      .select("id", { count: "exact", head: true })
      .eq("placement_key", placement.placement_key);

    const hasStats = (statsCount ?? 0) > 0;

    const { error } = await supabase
      .from("ad_placements")
      .update({ archived_at: new Date().toISOString(), is_enabled: false, updated_by: actorId })
      .eq("id", id);

    if (error) return { error: error.message };

    if (actorId) {
      await logAdPlacementAudit({
        actorId,
        action: "ad_placement.archive",
        placementId: id,
        metadata: { had_stats: Boolean(hasStats) }
      });
    }
    return { error: null };
  } catch {
    return { error: "Không lưu trữ được placement." };
  }
}

export async function duplicateAdPlacementAdmin(
  id: string,
  actorId?: string
): Promise<{ item: AdPlacementRow | null; error: string | null }> {
  const { item: source, error: loadError } = await getAdPlacementByIdAdmin(id);
  if (loadError || !source) return { item: null, error: loadError ?? "Không tìm thấy placement." };

  const suffix = Date.now().toString(36).slice(-4);
  const newKey = `${source.placement_key}_copy_${suffix}`.slice(0, 64);

  const created = await createAdPlacementAdmin(
    {
      placement_key: newKey,
      name: `${source.name} (bản sao)`,
      description: source.description,
      surface: source.surface,
      page_pattern: source.page_pattern,
      device: source.device,
      position: source.position,
      ad_format: source.ad_format,
      size_mode: source.size_mode,
      width: source.width,
      height: source.height,
      max_width: source.max_width,
      min_height: source.min_height,
      adsense_slot_id: source.adsense_slot_id,
      adsense_client_id: source.adsense_client_id,
      is_enabled: false,
      is_test_mode: true,
      priority: source.priority + 1,
      max_per_page: source.max_per_page,
      min_content_gap: source.min_content_gap,
      max_ads_per_chapter: source.max_ads_per_chapter,
      min_paragraphs_before: source.min_paragraphs_before,
      min_paragraphs_after: source.min_paragraphs_after,
      min_distance_px: source.min_distance_px,
      feed_cooldown_items: source.feed_cooldown_items,
      show_label: source.show_label,
      lazy_load: source.lazy_load,
      reserve_space: source.reserve_space,
      sticky_allowed: source.sticky_allowed,
      hide_for_vip: source.hide_for_vip,
      hide_for_owner: source.hide_for_owner,
      hide_on_sensitive_content: source.hide_on_sensitive_content,
      no_ads_respect: source.no_ads_respect,
      full_width_responsive: source.full_width_responsive,
      fallback_text: source.fallback_text,
      revenue_eligible: source.revenue_eligible,
      attribution_mode: source.attribution_mode,
      revenue_bucket: source.revenue_bucket,
      frequency_rule: source.frequency_rule,
      excluded_routes: source.excluded_routes,
      allowed_roles: source.allowed_roles,
      notes: source.notes,
      internal_note: source.internal_note
    },
    actorId
  );

  if (created.item && actorId) {
    await logAdPlacementAudit({
      actorId,
      action: "ad_placement.duplicate",
      placementId: created.item.id,
      placementKey: created.item.placement_key,
      metadata: { source_id: id, source_key: source.placement_key }
    });
  }

  return created;
}
