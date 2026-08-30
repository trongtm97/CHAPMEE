import { ALGORITHM_WEIGHT_GROUPS } from "@/lib/algorithm/weight-groups";
import { buildAlgorithmHealthChecks, deriveOverviewKpis } from "@/lib/algorithm/health";
import { createAdminClient } from "@/lib/data/admin";
import { createClient } from "@/lib/data/server";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import type {
  AlgorithmConfig,
  AlgorithmControlCenterData,
  AlgorithmSettingAuditRow,
  AlgorithmSettingCategory,
  AlgorithmSettingRow,
  AlgorithmValueType,
  AlgorithmWeightValidation
} from "@/types/algorithm-settings";

const SUM_TOLERANCE = 0.02;
const CONTENT_ORIGIN_MIX_DEFAULTS: Array<{
  key: string;
  value: number | boolean;
  value_type: AlgorithmValueType;
  label: string;
  description: string;
  min_value: number | null;
  max_value: number | null;
}> = [
  {
    key: "content_origin.original_min_exposure_percent",
    value: 60,
    value_type: "percentage",
    label: "Original tối thiểu (%)",
    description: "Tỉ lệ exposure tối thiểu cho Truyện Sáng Tác.",
    min_value: 0,
    max_value: 100
  },
  {
    key: "content_origin.translation_max_exposure_percent",
    value: 40,
    value_type: "percentage",
    label: "Translation tối đa (%)",
    description: "Tỉ lệ exposure tối đa cho Truyện Dịch.",
    min_value: 0,
    max_value: 100
  },
  {
    key: "content_origin.reels_original_min_percent",
    value: 60,
    value_type: "percentage",
    label: "Reels original tối thiểu (%)",
    description: "Tỉ lệ tối thiểu original trong Reels feed.",
    min_value: 0,
    max_value: 100
  },
  {
    key: "content_origin.reels_translation_max_percent",
    value: 40,
    value_type: "percentage",
    label: "Reels translation tối đa (%)",
    description: "Tỉ lệ tối đa translation trong Reels feed.",
    min_value: 0,
    max_value: 100
  },
  {
    key: "content_origin.discover_original_featured_min_percent",
    value: 60,
    value_type: "percentage",
    label: "Discover original nổi bật tối thiểu (%)",
    description: "Tỉ lệ tối thiểu original ở Discover sections.",
    min_value: 0,
    max_value: 100
  },
  {
    key: "content_origin.translation_requires_rights_for_promotion",
    value: false,
    value_type: "boolean",
    label: "Translation cần verified rights để được promote",
    description: "Bật để chỉ promote truyện dịch đã verified quyền.",
    min_value: null,
    max_value: null
  },
  {
    key: "content_origin.separate_rankings_enabled",
    value: true,
    value_type: "boolean",
    label: "Bật BXH riêng theo content origin",
    description: "Hiển thị BXH riêng original/translation/free.",
    min_value: null,
    max_value: null
  },
  {
    key: "content_origin.content_origin_fairness_enabled",
    value: true,
    value_type: "boolean",
    label: "Bật fairness content origin",
    description: "Bật caps/quota ngăn translation monopoly.",
    min_value: null,
    max_value: null
  }
];

type DbSettingRow = {
  id: string;
  key: string;
  value: unknown;
  value_type: AlgorithmValueType;
  category: AlgorithmSettingCategory;
  label: string;
  description: string | null;
  min_value: number | null;
  max_value: number | null;
  default_value: unknown;
  is_active: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export function parseAlgorithmStoredValue(
  value: unknown,
  valueType: AlgorithmValueType
): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  if (valueType === "boolean") {
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
    return Boolean(value);
  }

  if (valueType === "number" || valueType === "percentage") {
    if (typeof value === "number") return value;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (valueType === "string") {
    if (typeof value === "string") return value;
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }

  return value;
}

export function serializeAlgorithmValue(
  raw: unknown,
  valueType: AlgorithmValueType
): unknown {
  const parsed = parseAlgorithmStoredValue(raw, valueType);
  if (parsed === null && valueType !== "json") {
    throw new Error("Giá trị không hợp lệ.");
  }

  if (valueType === "json") {
    if (typeof raw === "string") {
      return JSON.parse(raw);
    }
    return parsed;
  }

  return parsed;
}

export function validateAlgorithmValueBounds(
  row: Pick<DbSettingRow, "min_value" | "max_value" | "value_type">,
  value: unknown
): string | null {
  if (row.value_type !== "number" && row.value_type !== "percentage") {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "Giá trị phải là số.";
  }

  if (row.min_value != null && numeric < row.min_value) {
    return `Giá trị tối thiểu là ${row.min_value}.`;
  }
  if (row.max_value != null && numeric > row.max_value) {
    return `Giá trị tối đa là ${row.max_value}.`;
  }

  return null;
}

export async function getAlgorithmSetting(key: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("algorithm_settings")
    .select("*")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    if (isMissingSchemaError(error)) return null;
    throw error;
  }

  if (!data) return null;

  return {
    ...data,
    value: parseAlgorithmStoredValue(data.value, data.value_type)
  } as AlgorithmSettingRow;
}

export async function getAlgorithmSettingsByCategory(category: AlgorithmSettingCategory) {
  const db = await createClient();
  const { data, error } = await db
    .from("algorithm_settings")
    .select("*")
    .eq("category", category)
    .order("key", { ascending: true });

  if (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }

  return (data ?? []).map((row) => ({
    ...row,
    value: parseAlgorithmStoredValue(row.value, row.value_type),
    default_value: parseAlgorithmStoredValue(row.default_value, row.value_type)
  })) as AlgorithmSettingRow[];
}

export async function getAllAlgorithmSettings() {
  const db = await createClient();
  const { data, error } = await db
    .from("algorithm_settings")
    .select("*")
    .order("category", { ascending: true })
    .order("key", { ascending: true });

  if (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }

  return (data ?? []).map((row) => ({
    ...row,
    value: parseAlgorithmStoredValue(row.value, row.value_type),
    default_value: parseAlgorithmStoredValue(row.default_value, row.value_type)
  })) as AlgorithmSettingRow[];
}

export async function getAlgorithmConfig(): Promise<AlgorithmConfig> {
  const settings = await getAllAlgorithmSettings();
  const config: AlgorithmConfig = {};

  for (const row of settings) {
    if (!row.is_active) continue;
    config[row.key] = row.value;
  }

  return config;
}

async function ensureContentOriginMixSettings() {
  try {
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("algorithm_settings")
      .select("key")
      .in(
        "key",
        CONTENT_ORIGIN_MIX_DEFAULTS.map((item) => item.key)
      );
    const existingKeys = new Set((existing ?? []).map((row) => row.key));
    const missing = CONTENT_ORIGIN_MIX_DEFAULTS.filter((item) => !existingKeys.has(item.key));
    if (missing.length === 0) return;
    await admin.from("algorithm_settings").insert(
      missing.map((item) => ({
        key: item.key,
        value: item.value,
        value_type: item.value_type,
        category: "fairness",
        label: item.label,
        description: item.description,
        min_value: item.min_value,
        max_value: item.max_value,
        default_value: item.value,
        is_active: true
      }))
    );
  } catch {
    // No-op: do not block settings page when table permissions differ.
  }
}

export function validateAlgorithmWeights(
  settings: AlgorithmSettingRow[]
): AlgorithmWeightValidation[] {
  const byKey = new Map(settings.map((s) => [s.key, s]));

  return ALGORITHM_WEIGHT_GROUPS.map((group) => {
    const keys = settings
      .filter(
        (s) =>
          s.is_active &&
          s.key.startsWith(group.keyPrefix) &&
          s.key.includes(".weight.")
      )
      .map((s) => s.key);

    const sum = keys.reduce((total, key) => {
      const row = byKey.get(key);
      const value = Number(row?.value ?? 0);
      return total + (Number.isFinite(value) ? value : 0);
    }, 0);

    const delta = sum - group.targetSum;
    const isValid = Math.abs(delta) <= SUM_TOLERANCE;

    return {
      groupId: group.id,
      label: group.label,
      keys,
      sum: Math.round(sum * 1000) / 1000,
      targetSum: group.targetSum,
      isValid,
      delta: Math.round(delta * 1000) / 1000
    };
  });
}

export function normalizeCategoryWeights(
  settings: AlgorithmSettingRow[],
  category: AlgorithmSettingCategory
): Record<string, number> {
  const group = ALGORITHM_WEIGHT_GROUPS.find((g) => g.category === category);
  if (!group) {
    return {};
  }

  const weightRows = settings.filter(
    (s) => s.is_active && s.key.startsWith(group.keyPrefix)
  );
  const sum = weightRows.reduce((t, row) => t + Number(row.value ?? 0), 0);
  if (sum <= 0) {
    throw new Error("Không thể chuẩn hóa: tổng trọng số bằng 0.");
  }

  const normalized: Record<string, number> = {};
  for (const row of weightRows) {
    const value = Number(row.value ?? 0);
    normalized[row.key] = Math.round((value / sum) * 1000) / 1000;
  }
  return normalized;
}

async function writeAlgorithmAuditLog(input: {
  settingKey: string;
  oldValue: unknown;
  newValue: unknown;
  changedBy: string | null;
  reason: string | null;
}) {
  const db = await createClient();
  await db.from("algorithm_setting_audit_logs").insert({
    setting_key: input.settingKey,
    old_value: input.oldValue,
    new_value: input.newValue,
    changed_by: input.changedBy,
    reason: input.reason
  });
}

export async function updateAlgorithmSetting(
  key: string,
  value: unknown,
  changedBy: string | null,
  reason?: string | null
) {
  const db = await createClient();
  const { data: existing, error: fetchError } = await db
    .from("algorithm_settings")
    .select("*")
    .eq("key", key)
    .maybeSingle();

  if (fetchError) {
    if (isMissingSchemaError(fetchError)) {
      return { success: false as const, error: "Bảng algorithm_settings chưa được migrate." };
    }
    return { success: false as const, error: fetchError.message };
  }

  if (!existing) {
    return { success: false as const, error: "Không tìm thấy setting." };
  }

  let serialized: unknown;
  try {
    serialized = serializeAlgorithmValue(value, existing.value_type);
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Giá trị không hợp lệ."
    };
  }

  const boundsError = validateAlgorithmValueBounds(
    existing as Parameters<typeof validateAlgorithmValueBounds>[0],
    serialized
  );
  if (boundsError) {
    return { success: false as const, error: boundsError };
  }

  const { error: updateError } = await db
    .from("algorithm_settings")
    .update({
      value: serialized,
      updated_by: changedBy
    })
    .eq("key", key);

  if (updateError) {
    return { success: false as const, error: updateError.message };
  }

  await writeAlgorithmAuditLog({
    settingKey: key,
    oldValue: existing.value,
    newValue: serialized,
    changedBy,
    reason: reason ?? null
  });

  return { success: true as const, error: null };
}

export async function resetAlgorithmSettingToDefault(
  key: string,
  changedBy: string | null,
  reason?: string | null
) {
  const db = await createClient();
  const { data: existing, error: fetchError } = await db
    .from("algorithm_settings")
    .select("*")
    .eq("key", key)
    .maybeSingle();

  if (fetchError || !existing) {
    return {
      success: false as const,
      error: fetchError?.message ?? "Không tìm thấy setting."
    };
  }

  const defaultValue = existing.default_value ?? existing.value;
  return updateAlgorithmSetting(key, defaultValue, changedBy, reason ?? "reset_to_default");
}

export async function getAlgorithmAuditLogs(limit = 50) {
  const db = await createClient();
  const { data, error } = await db
    .from("algorithm_setting_audit_logs")
    .select("id, setting_key, old_value, new_value, changed_by, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }

  const rows = data ?? [];
  const actorIds = [
    ...new Set(rows.map((r) => r.changed_by).filter(Boolean))
  ] as string[];

  const profileMap = new Map<string, { username: string | null; display_name: string | null }>();
  if (actorIds.length > 0) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id, username, display_name")
      .in("id", actorIds);
    for (const profile of profiles ?? []) {
      profileMap.set(profile.id, {
        username: profile.username,
        display_name: profile.display_name
      });
    }
  }

  return rows.map((row) => ({
    id: row.id,
    setting_key: row.setting_key,
    old_value: row.old_value,
    new_value: row.new_value,
    changed_by: row.changed_by,
    reason: row.reason,
    created_at: row.created_at,
    changer: row.changed_by ? profileMap.get(row.changed_by) ?? null : null
  })) as AlgorithmSettingAuditRow[];
}

async function getExposureConcentration() {
  const db = await createClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await db
    .from("exposure_events")
    .select("author_user_id, story_id")
    .gte("created_at", since)
    .limit(5000);

  if (error) {
    if (isMissingSchemaError(error)) return null;
    return null;
  }

  if (!data?.length) {
    return {
      topAuthorSharePercent: null,
      topStorySharePercent: null,
      sampleDays: 7
    };
  }

  const authorCounts = new Map<string, number>();
  const storyCounts = new Map<string, number>();
  for (const row of data) {
    if (row.author_user_id) {
      authorCounts.set(
        row.author_user_id,
        (authorCounts.get(row.author_user_id) ?? 0) + 1
      );
    }
    if (row.story_id) {
      storyCounts.set(row.story_id, (storyCounts.get(row.story_id) ?? 0) + 1);
    }
  }

  const total = data.length;
  const topAuthor = Math.max(0, ...authorCounts.values());
  const topStory = Math.max(0, ...storyCounts.values());

  return {
    topAuthorSharePercent: Math.round((topAuthor / total) * 1000) / 10,
    topStorySharePercent: Math.round((topStory / total) * 1000) / 10,
    sampleDays: 7
  };
}

function buildConfigWarnings(
  settings: AlgorithmSettingRow[],
  weightValidations: AlgorithmWeightValidation[]
): string[] {
  const warnings: string[] = [];

  for (const validation of weightValidations) {
    if (!validation.isValid) {
      warnings.push(
        `${validation.label}: tổng = ${validation.sum} (mục tiêu ${validation.targetSum}).`
      );
    }
  }

  const coldStory = Number(
    settings.find((s) => s.key === "cold_start.new_story_initial_impressions")?.value ?? 0
  );
  if (coldStory <= 0) {
    warnings.push("Cold start truyện mới đang ở 0.");
  }

  const reportPenalty = Number(
    settings.find((s) => s.key === "safety.report_penalty")?.value ?? 0
  );
  if (reportPenalty <= 0) {
    warnings.push("Penalty báo cáo (safety) đang tắt.");
  }

  return warnings;
}

async function loadColdStartSummaryForOverview(): Promise<
  import("@/types/algorithm-settings").AlgorithmColdStartSummary | null
> {
  try {
    const db = createAdminClient();
    const { count: activeCount, error: activeError } = await db
      .from("cold_start_tests")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");

    if (activeError) {
      if (isMissingSchemaError(activeError)) {
        return { activeCount: 0, qualifiedCount: 0, failedCount: 0, schemaMissing: true };
      }
      return null;
    }

    const [{ count: qualifiedCount }, { count: failedCount }] = await Promise.all([
      db
        .from("cold_start_tests")
        .select("id", { count: "exact", head: true })
        .eq("status", "qualified"),
      db
        .from("cold_start_tests")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed")
    ]);

    return {
      activeCount: activeCount ?? 0,
      qualifiedCount: qualifiedCount ?? 0,
      failedCount: failedCount ?? 0
    };
  } catch {
    return null;
  }
}

export async function loadAlgorithmControlCenterData(options?: {
  canUpdate: boolean;
}): Promise<AlgorithmControlCenterData> {
  try {
    await ensureContentOriginMixSettings();
    const settings = await getAllAlgorithmSettings();
    const weightValidations = validateAlgorithmWeights(settings);
    const activeCount = settings.filter((s) => s.is_active).length;
    const lastUpdatedAt =
      settings.reduce<string | null>((latest, row) => {
        if (!latest || row.updated_at > latest) return row.updated_at;
        return latest;
      }, null) ?? null;

    const versionSetting = settings.find((s) => s.key === "system.algorithm_version");
    const version =
      typeof versionSetting?.value === "string"
        ? versionSetting.value
        : "1.0.0";

    const auditLogs = await getAlgorithmAuditLogs(40);
    const [exposureConcentration, coldStartSummary] = await Promise.all([
      getExposureConcentration(),
      loadColdStartSummaryForOverview()
    ]);

    const partial = {
      settings,
      weightValidations,
      configWarnings: buildConfigWarnings(settings, weightValidations),
      exposureConcentration,
      coldStartSummary
    };
    const { status: healthStatus, checks: healthChecks } =
      buildAlgorithmHealthChecks(partial);
    const overviewKpis = deriveOverviewKpis(
      {
        error: null,
        version,
        activeCount,
        totalCount: settings.length,
        lastUpdatedAt,
        configWarnings: partial.configWarnings,
        weightValidations,
        exposureConcentration,
        coldStartSummary,
        healthStatus,
        healthChecks,
        overviewKpis: {
          coldStartActive: null,
          authorsOverCap: 0,
          qualityPenaltyActive: 0,
          surfacesActive: 0,
          invalidWeightGroups: 0
        },
        settings,
        auditLogs,
        canUpdate: options?.canUpdate ?? false
      },
      weightValidations
    );

    return {
      error: null,
      version,
      activeCount,
      totalCount: settings.length,
      lastUpdatedAt,
      configWarnings: partial.configWarnings,
      weightValidations,
      exposureConcentration,
      coldStartSummary,
      healthStatus,
      healthChecks,
      overviewKpis,
      settings,
      auditLogs,
      canUpdate: options?.canUpdate ?? false
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Không tải được cấu hình thuật toán.",
      version: "—",
      activeCount: 0,
      totalCount: 0,
      lastUpdatedAt: null,
      configWarnings: [],
      weightValidations: [],
      exposureConcentration: null,
      coldStartSummary: null,
      healthStatus: "warning" as const,
      healthChecks: [],
      overviewKpis: {
        coldStartActive: null,
        authorsOverCap: 0,
        qualityPenaltyActive: 0,
        surfacesActive: 0,
        invalidWeightGroups: 0
      },
      settings: [],
      auditLogs: [],
      canUpdate: options?.canUpdate ?? false
    };
  }
}
