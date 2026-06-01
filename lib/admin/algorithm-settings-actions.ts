"use server";

import { revalidatePath } from "next/cache";
import { detectDangerousAlgorithmChange } from "@/lib/algorithm/dangerous-changes";
import {
  normalizeCategoryWeights,
  resetAlgorithmSettingToDefault,
  serializeAlgorithmValue,
  updateAlgorithmSetting
} from "@/lib/algorithm/settings";
import { requireFinanceSettingsUpdate } from "@/lib/auth/require-permission";
import type { AlgorithmSettingCategory } from "@/types/algorithm-settings";

const REVALIDATE_PATHS = [
  "/admin/algorithm",
  "/admin/algorithm/settings",
  "/admin/algorithm/fairness",
  "/admin/algorithm/audit"
];

function revalidateAlgorithmPages() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path);
  }
}

export type AlgorithmSettingActionState = {
  ok: boolean;
  message: string | null;
};

export async function updateAlgorithmSettingAction(input: {
  key: string;
  value: unknown;
  reason?: string | null;
  confirmDangerous?: boolean;
}): Promise<AlgorithmSettingActionState> {
  const guard = await requireFinanceSettingsUpdate();
  if (!guard.ok || !guard.context) {
    return { ok: false, message: guard.error };
  }

  const dangerous = detectDangerousAlgorithmChange(input.key, input.value);
  if (dangerous && !input.confirmDangerous) {
    return {
      ok: false,
      message: `${dangerous.message} Vui lòng xác nhận trước khi lưu.`
    };
  }

  const result = await updateAlgorithmSetting(
    input.key,
    input.value,
    guard.context.userId,
    input.reason ?? null
  );

  if (!result.success) {
    return { ok: false, message: result.error };
  }

  revalidateAlgorithmPages();
  return { ok: true, message: "Đã lưu cấu hình." };
}

export async function resetAlgorithmSettingAction(input: {
  key: string;
  reason?: string | null;
}): Promise<AlgorithmSettingActionState> {
  const guard = await requireFinanceSettingsUpdate();
  if (!guard.ok || !guard.context) {
    return { ok: false, message: guard.error };
  }

  const result = await resetAlgorithmSettingToDefault(
    input.key,
    guard.context.userId,
    input.reason ?? "reset_default"
  );

  if (!result.success) {
    return { ok: false, message: result.error };
  }

  revalidateAlgorithmPages();
  return { ok: true, message: "Đã khôi phục mặc định." };
}

export async function normalizeAlgorithmWeightsAction(
  category: AlgorithmSettingCategory
): Promise<AlgorithmSettingActionState> {
  const guard = await requireFinanceSettingsUpdate();
  if (!guard.ok || !guard.context) {
    return { ok: false, message: guard.error };
  }

  const { getAlgorithmSettingsByCategory } = await import("@/lib/algorithm/settings");
  const settings = await getAlgorithmSettingsByCategory(category);

  let normalized: Record<string, number>;
  try {
    normalized = normalizeCategoryWeights(settings, category);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Không thể chuẩn hóa."
    };
  }

  for (const [key, value] of Object.entries(normalized)) {
    const result = await updateAlgorithmSetting(
      key,
      value,
      guard.context.userId,
      `normalize_weights:${category}`
    );
    if (!result.success) {
      return { ok: false, message: result.error };
    }
  }

  revalidateAlgorithmPages();
  return { ok: true, message: `Đã chuẩn hóa trọng số ${category}.` };
}

export async function saveAlgorithmSettingFormAction(
  _prev: AlgorithmSettingActionState,
  formData: FormData
): Promise<AlgorithmSettingActionState> {
  const key = String(formData.get("key") ?? "");
  const valueType = String(formData.get("value_type") ?? "number");
  const rawValue = String(formData.get("value") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  const confirmDangerous = formData.get("confirm_dangerous") === "true";

  if (!key) {
    return { ok: false, message: "Thiếu key setting." };
  }

  let value: unknown = rawValue;
  if (valueType === "boolean") {
    value = rawValue === "true";
  } else if (valueType === "number" || valueType === "percentage") {
    value = Number(rawValue);
  } else if (valueType === "json") {
    try {
      value = serializeAlgorithmValue(rawValue, "json");
    } catch {
      return { ok: false, message: "JSON không hợp lệ." };
    }
  }

  return updateAlgorithmSettingAction({
    key,
    value,
    reason,
    confirmDangerous
  });
}

export async function bumpAlgorithmVersionAction(input?: {
  reason?: string | null;
}): Promise<AlgorithmSettingActionState> {
  const guard = await requireFinanceSettingsUpdate();
  if (!guard.ok || !guard.context) {
    return { ok: false, message: guard.error };
  }

  const { getAllAlgorithmSettings } = await import("@/lib/algorithm/settings");
  const settings = await getAllAlgorithmSettings();
  const current = settings.find((s) => s.key === "system.algorithm_version");
  const raw =
    typeof current?.value === "string" ? current.value : "1.0.0";
  const parts = raw.split(".").map((p) => Number.parseInt(p, 10) || 0);
  while (parts.length < 3) parts.push(0);
  parts[2] += 1;
  const nextVersion = parts.join(".");

  const result = await updateAlgorithmSetting(
    "system.algorithm_version",
    nextVersion,
    guard.context.userId,
    input?.reason ?? "bump_version"
  );

  if (!result.success) {
    return { ok: false, message: result.error };
  }

  revalidateAlgorithmPages();
  return { ok: true, message: `Đã tạo phiên bản ${nextVersion}.` };
}
