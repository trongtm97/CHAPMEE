"use server";

import {
  DEFAULT_MONETIZATION_SETTINGS,
  MONETIZATION_SETTING_DEFINITIONS,
  refreshMonetizationConfig
} from "@/lib/monetization/config";
import { checkStaffPermission } from "@/lib/auth/staff-guards";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { upsertMonetizationSettings } from "@/lib/supabase/monetization-settings";
import type {
  MonetizationSettingDefinition,
  MonetizationSettingValue,
  MonetizationSettingsMap
} from "@/types/monetization";

export type MonetizationSettingsActionState = {
  ok: boolean;
  message: string | null;
  settings: MonetizationSettingsMap;
  updatedAt: string | null;
};

export const INITIAL_MONETIZATION_ACTION_STATE: MonetizationSettingsActionState = {
  ok: false,
  message: null,
  settings: DEFAULT_MONETIZATION_SETTINGS,
  updatedAt: null
};

function sanitizeSettingValue(
  definition: MonetizationSettingDefinition,
  value: unknown
): MonetizationSettingValue {
  if (definition.inputType === "boolean") {
    return typeof value === "boolean" ? value : value === "true";
  }

  if (definition.inputType === "number") {
    const parsed = typeof value === "number" ? value : Number(value);
    const fallback = Number(definition.defaultValue);
    const numericValue = Number.isFinite(parsed) ? parsed : fallback;
    const min = definition.min ?? Number.NEGATIVE_INFINITY;
    const max = definition.max ?? Number.POSITIVE_INFINITY;
    return Math.min(Math.max(numericValue, min), max);
  }

  return typeof value === "string" ? value : String(definition.defaultValue);
}

function sanitizePayload(rawPayload: unknown): MonetizationSettingsMap {
  const payload =
    rawPayload && typeof rawPayload === "object"
      ? (rawPayload as Record<string, unknown>)
      : {};
  const sanitized = { ...DEFAULT_MONETIZATION_SETTINGS };

  for (const definition of MONETIZATION_SETTING_DEFINITIONS) {
    sanitized[definition.key] = sanitizeSettingValue(
      definition,
      payload[definition.key]
    );
  }

  return sanitized;
}

async function assertSettingsStaff() {
  const auth = await checkStaffPermission("admin.settings.update");
  if (!auth.ok) {
    return { error: auth.error, userId: null as string | null };
  }
  return { error: null, userId: auth.userId };
}

export async function updateMonetizationSettingsAction(
  _prevState: MonetizationSettingsActionState,
  formData: FormData
): Promise<MonetizationSettingsActionState> {
  const auth = await assertSettingsStaff();
  if (auth.error || !auth.userId) {
    return {
      ...INITIAL_MONETIZATION_ACTION_STATE,
      message: auth.error ?? "Bạn không có quyền cập nhật monetization settings."
    };
  }

  const rawPayload = formData.get("settingsPayload");
  let payload: unknown = {};
  if (typeof rawPayload === "string" && rawPayload.length > 0) {
    try {
      payload = JSON.parse(rawPayload);
    } catch {
      payload = {};
    }
  }

  const settings = sanitizePayload(payload);
  const result = await upsertMonetizationSettings(
    MONETIZATION_SETTING_DEFINITIONS.map((definition) => ({
      key: definition.key,
      value: settings[definition.key],
      description: definition.description,
      isPublic: definition.isPublic
    })),
    auth.userId ?? null
  );

  if (!result.success) {
    return {
      ok: false,
      message: result.error ?? "Không thể lưu monetization settings.",
      settings,
      updatedAt: null
    };
  }

  refreshMonetizationConfig();

  await logAdminAction({
    actorId: auth.userId,
    action: "update_app_settings",
    targetType: "monetization_settings",
    targetId: "bulk",
    metadata: { keys: Object.keys(settings) }
  });

  return {
    ok: true,
    message: "Đã lưu monetization settings.",
    settings,
    updatedAt: new Date().toISOString()
  };
}

export async function resetMonetizationSettingsAction(
  _prevState: MonetizationSettingsActionState,
  _formData: FormData
): Promise<MonetizationSettingsActionState> {
  void _prevState;
  void _formData;
  const auth = await assertSettingsStaff();
  if (auth.error || !auth.userId) {
    return {
      ...INITIAL_MONETIZATION_ACTION_STATE,
      message: auth.error ?? "Bạn không có quyền reset monetization settings."
    };
  }

  const result = await upsertMonetizationSettings(
    MONETIZATION_SETTING_DEFINITIONS.map((definition) => ({
      key: definition.key,
      value: definition.defaultValue,
      description: definition.description,
      isPublic: definition.isPublic
    })),
    auth.userId ?? null
  );

  if (!result.success) {
    return {
      ok: false,
      message: result.error ?? "Không thể reset monetization settings.",
      settings: DEFAULT_MONETIZATION_SETTINGS,
      updatedAt: null
    };
  }

  refreshMonetizationConfig();

  return {
    ok: true,
    message: "Đã reset về default monetization settings.",
    settings: DEFAULT_MONETIZATION_SETTINGS,
    updatedAt: new Date().toISOString()
  };
}
