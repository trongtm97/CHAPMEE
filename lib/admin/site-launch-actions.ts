"use server";

import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { upsertSiteLaunchSettings } from "@/lib/data/site-launch-settings.server";
import { requireAdminSettingsAccess } from "@/lib/auth/require-permission";
import {
  defaultSiteLaunchSettings,
  parseSiteLaunchSettings,
  SITE_LAUNCH_SETTINGS_KEY,
  type SiteLaunchSettings
} from "@/lib/settings/site-launch-settings";

export type SiteLaunchActionState = {
  ok: boolean;
  message: string;
  settings?: SiteLaunchSettings;
};

function readBoolean(formData: FormData, name: string): boolean {
  return formData.get(name) === "on" || formData.get(name) === "true";
}

function readSettingsFromForm(formData: FormData): SiteLaunchSettings {
  return parseSiteLaunchSettings({
    block_search_engines: readBoolean(formData, "blockSearchEngines"),
    coming_soon_enabled: readBoolean(formData, "comingSoonEnabled"),
    coming_soon_title: String(formData.get("comingSoonTitle") ?? "").trim(),
    coming_soon_message: String(formData.get("comingSoonMessage") ?? "").trim(),
    show_login_link: readBoolean(formData, "showLoginLink")
  });
}

export async function getAdminSiteLaunchSettingsAction() {
  const guard = await requireAdminSettingsAccess("/admin/settings/launch");
  if (!guard.ok) {
    return { ok: false as const, error: guard.error, settings: null };
  }

  const { getSiteLaunchSettings } = await import("@/lib/settings/get-site-launch-settings");
  const settings = await getSiteLaunchSettings({ useCache: false });
  return { ok: true as const, error: null, settings };
}

export async function updateSiteLaunchSettingsAction(
  formData: FormData
): Promise<SiteLaunchActionState> {
  const guard = await requireAdminSettingsAccess("/admin/settings/launch");
  if (!guard.ok) {
    return { ok: false, message: guard.error };
  }

  let settings: SiteLaunchSettings;
  try {
    settings = readSettingsFromForm(formData);
  } catch {
    return { ok: false, message: "Dữ liệu không hợp lệ." };
  }

  const result = await upsertSiteLaunchSettings(settings, guard.context?.userId ?? null);
  if (!result.success) {
    return { ok: false, message: result.error ?? "Không lưu được cấu hình." };
  }

  await logAdminAction({
    actorId: guard.context.userId,
    action: "update_app_settings",
    targetType: "site_launch_settings",
    targetId: SITE_LAUNCH_SETTINGS_KEY,
    metadata: {
      block_search_engines: settings.block_search_engines,
      coming_soon_enabled: settings.coming_soon_enabled
    }
  });

  revalidatePath("/admin/settings/launch");
  return { ok: true, message: "Đã lưu cấu hình ra mắt / SEO tạm thời.", settings };
}

export async function resetSiteLaunchSettingsAction(): Promise<SiteLaunchActionState> {
  const guard = await requireAdminSettingsAccess("/admin/settings/launch");
  if (!guard.ok) {
    return { ok: false, message: guard.error };
  }

  const result = await upsertSiteLaunchSettings(
    defaultSiteLaunchSettings,
    guard.context?.userId ?? null
  );
  if (!result.success) {
    return { ok: false, message: result.error ?? "Không đặt lại được cấu hình." };
  }

  await logAdminAction({
    actorId: guard.context.userId,
    action: "update_app_settings",
    targetType: "site_launch_settings",
    targetId: SITE_LAUNCH_SETTINGS_KEY,
    metadata: { reset: true }
  });

  return {
    ok: true,
    message: "Đã đặt lại về mặc định (tắt chặn crawler và Coming soon).",
    settings: defaultSiteLaunchSettings
  };
}
