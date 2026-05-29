"use server";

import { revalidateTag } from "next/cache";
import type { ContactSettingsActionState } from "@/lib/admin/contact-settings-actions.types";
import {
  DEFAULT_CONTACT_SETTINGS,
  CONTACT_SETTINGS_CACHE_TAG
} from "@/lib/settings/default-contact-settings";
import {
  parseContactSettingsDb,
  toContactSettings
} from "@/lib/settings/contact-settings-mapper";
import {
  hasValidationErrors,
  validateContactSettings
} from "@/lib/settings/validate-contact-settings";
import type { ContactSettings } from "@/types/contact-settings";

export type { ContactSettingsActionState };

function sanitizePayload(rawPayload: unknown): ContactSettings {
  const payload =
    rawPayload && typeof rawPayload === "object"
      ? (rawPayload as Record<string, unknown>)
      : {};

  return toContactSettings(parseContactSettingsDb(payload));
}

async function assertContactSettingsStaff() {
  const { checkStaffPermission } = await import("@/lib/auth/staff-guards");
  const auth = await checkStaffPermission("admin.settings.update");
  if (!auth.ok) {
    return { error: auth.error, userId: null as string | null };
  }
  return { error: null, userId: auth.userId };
}

export async function updateContactSettingsAction(
  _prevState: ContactSettingsActionState,
  formData: FormData
): Promise<ContactSettingsActionState> {
  const guard = await assertContactSettingsStaff();
  const rawPayload = formData.get("settingsPayload");

  let settings: ContactSettings;
  try {
    settings = sanitizePayload(
      typeof rawPayload === "string" ? JSON.parse(rawPayload) : rawPayload
    );
  } catch {
    return {
      ok: false,
      message: "Không thể lưu cài đặt. Vui lòng thử lại.",
      settings: _prevState.settings,
      updatedAt: _prevState.updatedAt,
      fieldErrors: {}
    };
  }

  if (guard.error) {
    return {
      ok: false,
      message: guard.error,
      settings,
      updatedAt: _prevState.updatedAt,
      fieldErrors: {}
    };
  }

  const fieldErrors = validateContactSettings(settings);
  if (hasValidationErrors(fieldErrors)) {
    const firstError =
      fieldErrors.supportEmail ??
      fieldErrors.facebookUrl ??
      fieldErrors.telegramUrl ??
      fieldErrors.contactTitle ??
      fieldErrors.contactDescription ??
      "Vui lòng kiểm tra lại các trường.";

    return {
      ok: false,
      message: firstError,
      settings,
      updatedAt: _prevState.updatedAt,
      fieldErrors: fieldErrors as Record<string, string>
    };
  }

  const { upsertContactSettings } = await import("@/lib/supabase/app-settings.server");
  const result = await upsertContactSettings(settings, guard.userId ?? null);
  if (!result.success) {
    return {
      ok: false,
      message: "Không thể lưu cài đặt. Vui lòng thử lại.",
      settings,
      updatedAt: _prevState.updatedAt,
      fieldErrors: {}
    };
  }

  revalidateTag(CONTACT_SETTINGS_CACHE_TAG, "max");

  if (guard.userId) {
    const { logAdminAction } = await import("@/lib/audit/log-admin-action");
    await logAdminAction({
      actorId: guard.userId,
      action: "update_app_settings",
      targetType: "contact_settings",
      targetId: "contact"
    });
  }

  return {
    ok: true,
    message: "Đã lưu cài đặt liên hệ.",
    settings,
    updatedAt: result.updatedAt,
    fieldErrors: {}
  };
}

export async function resetContactSettingsAction(
  _prevState: ContactSettingsActionState
): Promise<ContactSettingsActionState> {
  const guard = await assertContactSettingsStaff();
  if (guard.error) {
    return {
      ok: false,
      message: guard.error,
      settings: _prevState.settings,
      updatedAt: _prevState.updatedAt,
      fieldErrors: {}
    };
  }

  const { upsertContactSettings } = await import("@/lib/supabase/app-settings.server");
  const result = await upsertContactSettings(
    DEFAULT_CONTACT_SETTINGS,
    guard.userId ?? null
  );

  if (!result.success) {
    return {
      ok: false,
      message: "Không thể lưu cài đặt. Vui lòng thử lại.",
      settings: _prevState.settings,
      updatedAt: _prevState.updatedAt,
      fieldErrors: {}
    };
  }

  revalidateTag(CONTACT_SETTINGS_CACHE_TAG, "max");

  return {
    ok: true,
    message: "Đã khôi phục cài đặt mặc định.",
    settings: DEFAULT_CONTACT_SETTINGS,
    updatedAt: result.updatedAt,
    fieldErrors: {}
  };
}
