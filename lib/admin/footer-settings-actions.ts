"use server";

import { revalidateTag } from "next/cache";
import {
  defaultFooterConfig,
  FOOTER_CONFIG_CACHE_TAG,
  FOOTER_CONFIG_KEY,
  parseFooterConfig,
  safeParseFooterConfig,
  type FooterConfig
} from "@/lib/settings/footer-config";
import type { z } from "zod";
import type { FooterSettingsActionState } from "@/lib/admin/footer-settings-state";

function flattenZodErrors(issues: z.core.$ZodIssue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".");
    if (!out[key]) {
      out[key] = issue.message;
    }
  }
  return out;
}

async function assertFooterSettingsStaff() {
  const { checkStaffPermission } = await import("@/lib/auth/staff-guards");
  const auth = await checkStaffPermission("admin.settings.update");
  if (!auth.ok) {
    return { error: auth.error, userId: null as string | null };
  }
  return { error: null, userId: auth.userId };
}

function parsePayload(rawPayload: unknown): FooterConfig | null {
  try {
    const parsed =
      typeof rawPayload === "string" ? JSON.parse(rawPayload) : rawPayload;
    return parseFooterConfig(parsed);
  } catch {
    return null;
  }
}

export async function updateFooterSettingsAction(
  _prevState: FooterSettingsActionState,
  formData: FormData
): Promise<FooterSettingsActionState> {
  const guard = await assertFooterSettingsStaff();
  const rawPayload = formData.get("configPayload");

  let parsedRaw: unknown;
  try {
    parsedRaw =
      typeof rawPayload === "string" ? JSON.parse(rawPayload) : rawPayload;
  } catch {
    return {
      ok: false,
      message: "Không thể lưu cài đặt. Vui lòng thử lại.",
      config: _prevState.config,
      updatedAt: _prevState.updatedAt,
      fieldErrors: {}
    };
  }

  const validation = safeParseFooterConfig(parsedRaw);
  if (!validation.success) {
    return {
      ok: false,
      message: "Vui lòng kiểm tra lại các trường.",
      config: _prevState.config,
      updatedAt: _prevState.updatedAt,
      fieldErrors: flattenZodErrors(validation.error.issues)
    };
  }

  const config = validation.data;

  if (guard.error) {
    return {
      ok: false,
      message: guard.error,
      config,
      updatedAt: _prevState.updatedAt,
      fieldErrors: {}
    };
  }

  const { upsertFooterConfig } = await import("@/lib/data/footer-settings.server");
  const result = await upsertFooterConfig(config, guard.userId ?? null);
  if (!result.success) {
    return {
      ok: false,
      message: "Không thể lưu cài đặt. Vui lòng thử lại.",
      config,
      updatedAt: _prevState.updatedAt,
      fieldErrors: {}
    };
  }

  revalidateTag(FOOTER_CONFIG_CACHE_TAG, "max");

  if (guard.userId) {
    const { logAdminAction } = await import("@/lib/audit/log-admin-action");
    await logAdminAction({
      actorId: guard.userId,
      action: "update_footer_settings",
      targetType: "footer_config",
      targetId: FOOTER_CONFIG_KEY
    });
  }

  return {
    ok: true,
    message: "Đã lưu cài đặt footer.",
    config,
    updatedAt: result.updatedAt,
    fieldErrors: {}
  };
}

export async function resetFooterSettingsAction(
  _prevState: FooterSettingsActionState
): Promise<FooterSettingsActionState> {
  const guard = await assertFooterSettingsStaff();
  if (guard.error) {
    return {
      ok: false,
      message: guard.error,
      config: _prevState.config,
      updatedAt: _prevState.updatedAt,
      fieldErrors: {}
    };
  }

  const { upsertFooterConfig } = await import("@/lib/data/footer-settings.server");
  const result = await upsertFooterConfig(
    defaultFooterConfig,
    guard.userId ?? null
  );

  if (!result.success) {
    return {
      ok: false,
      message: "Không thể khôi phục mặc định.",
      config: _prevState.config,
      updatedAt: _prevState.updatedAt,
      fieldErrors: {}
    };
  }

  revalidateTag(FOOTER_CONFIG_CACHE_TAG, "max");

  if (guard.userId) {
    const { logAdminAction } = await import("@/lib/audit/log-admin-action");
    await logAdminAction({
      actorId: guard.userId,
      action: "update_footer_settings",
      targetType: "footer_config",
      targetId: FOOTER_CONFIG_KEY,
      metadata: { action: "reset_to_defaults" }
    });
  }

  return {
    ok: true,
    message: "Đã khôi phục footer mặc định.",
    config: defaultFooterConfig,
    updatedAt: result.updatedAt,
    fieldErrors: {}
  };
}

export async function parseFooterSettingsPayload(rawPayload: unknown) {
  return parsePayload(rawPayload);
}
