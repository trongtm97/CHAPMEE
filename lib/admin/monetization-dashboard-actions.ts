"use server";

import {
  getMonetizationConfig,
  getSettingDefinition,
  refreshMonetizationConfig
} from "@/lib/monetization/config";
import { checkStaffAnyPermission } from "@/lib/auth/staff-guards";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { upsertMonetizationSettings } from "@/lib/data/monetization-settings";
import {
  diffDashboardSettings,
  mergeDashboardSettings,
  MONETIZATION_DASHBOARD_KEYS,
  pickDashboardSettings,
  validateMonetizationDashboard,
  type MonetizationDashboardKey
} from "@/lib/admin/monetization";
import type {
  MonetizationSettingDefinition,
  MonetizationSettingValue,
  MonetizationSettingsMap
} from "@/types/monetization";

export type MonetizationDashboardActionState = {
  ok: boolean;
  message: string | null;
  settings: MonetizationSettingsMap | null;
  updatedAt: string | null;
  fieldErrors?: Partial<Record<MonetizationDashboardKey, string>>;
  formError?: string | null;
};

function sanitizeValue(
  definition: MonetizationSettingDefinition | undefined,
  value: unknown,
  fallback: MonetizationSettingValue
): MonetizationSettingValue {
  if (!definition) {
    return fallback;
  }
  if (definition.inputType === "boolean") {
    return typeof value === "boolean" ? value : value === "true";
  }
  if (definition.inputType === "number") {
    const parsed = typeof value === "number" ? value : Number(value);
    const numeric = Number.isFinite(parsed) ? parsed : Number(definition.defaultValue);
    const min = definition.min ?? Number.NEGATIVE_INFINITY;
    const max = definition.max ?? Number.POSITIVE_INFINITY;
    return Math.min(Math.max(numeric, min), max);
  }
  return typeof value === "string" ? value : String(definition.defaultValue);
}

function applyBusinessRules(settings: MonetizationSettingsMap): MonetizationSettingsMap {
  const next = { ...settings };
  if (Boolean(next["coin.purchase_enabled"])) {
    next["coin.enabled"] = true;
  }
  if (Boolean(next["creator_monetization.enabled"])) {
    next["monetization.enabled"] = true;
  }
  return next;
}

export async function saveMonetizationDashboardAction(input: {
  settings: Partial<MonetizationSettingsMap>;
  reason?: string;
}): Promise<MonetizationDashboardActionState> {
  const auth = await checkStaffAnyPermission([
    "finance.settings.update",
    "admin.settings.update",
    "finance.revenue_share.update",
    "finance.withdrawal_settings.update",
    "finance.risk_settings.update"
  ]);

  if (!auth.ok) {
    return {
      ok: false,
      message: auth.error,
      settings: null,
      updatedAt: null
    };
  }

  const { settings: currentConfig } = await getMonetizationConfig({
    includePrivate: true,
    useCache: false
  });

  const beforeDashboard = pickDashboardSettings(currentConfig);
  let merged = mergeDashboardSettings(currentConfig, input.settings);
  merged = applyBusinessRules(merged);

  for (const key of MONETIZATION_DASHBOARD_KEYS) {
    const definition = getSettingDefinition(key);
    merged[key] = sanitizeValue(definition, merged[key], merged[key]);
  }

  const validation = validateMonetizationDashboard(merged);
  if (!validation.ok) {
    return {
      ok: false,
      message: validation.formError ?? "Dữ liệu không hợp lệ.",
      settings: merged,
      updatedAt: null,
      fieldErrors: validation.fieldErrors,
      formError: validation.formError
    };
  }

  const afterDashboard = pickDashboardSettings(merged);
  const changed = diffDashboardSettings(beforeDashboard, afterDashboard);

  if (Object.keys(changed).length === 0) {
    return {
      ok: true,
      message: "Không có thay đổi nào.",
      settings: merged,
      updatedAt: new Date().toISOString()
    };
  }

  const reason = input.reason?.trim() ?? "";

  if (reason.length < 3) {
    return {
      ok: false,
      message: "Vui lòng nhập lý do thay đổi (ít nhất 3 ký tự).",
      settings: merged,
      updatedAt: null,
      formError: "Vui lòng nhập lý do thay đổi."
    };
  }

  const rows = Object.keys(changed).map((key) => {
    const k = key as MonetizationDashboardKey;
    const definition = getSettingDefinition(k);
    return {
      key: k,
      value: merged[k],
      description: definition?.description ?? "",
      isPublic: definition?.isPublic ?? false
    };
  });

  const result = await upsertMonetizationSettings(rows, auth.userId);

  if (!result.success) {
    return {
      ok: false,
      message: result.error ?? "Không thể lưu cấu hình.",
      settings: merged,
      updatedAt: null
    };
  }

  refreshMonetizationConfig();

  await logAdminAction({
    actorId: auth.userId,
    action: "monetization_settings.update",
    targetType: "monetization_settings",
    targetId: "dashboard",
    metadata: {
      changed_keys: Object.keys(changed),
      old_value: Object.fromEntries(
        Object.keys(changed).map((k) => [k, beforeDashboard[k as MonetizationDashboardKey]])
      ),
      new_value: changed,
      reason: reason || null
    }
  });

  return {
    ok: true,
    message: "Đã lưu cấu hình kiếm tiền.",
    settings: merged,
    updatedAt: new Date().toISOString()
  };
}
