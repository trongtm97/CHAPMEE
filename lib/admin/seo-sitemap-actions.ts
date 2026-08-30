"use server";

import { revalidatePath } from "next/cache";
import {
  getSeoSitemapSettings,
  updateSeoSitemapSettings,
  type SeoSitemapSettingsUpdateInput
} from "@/lib/seo/sitemap-service";
const REVALIDATE_PATHS = ["/admin/seo/sitemap", "/robots.txt", "/sitemap.xml"];

function revalidateSitemapSurfaces() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path);
  }
  revalidatePath("/internal/sitemap-index");
  revalidatePath("/internal/sitemap/[id]", "page");
}

async function requireSeoView() {
  const { checkStaffPermission } = await import("@/lib/auth/staff-guards");
  const view = await checkStaffPermission("seo.rule.view");
  if (view.ok) return view;
  return checkStaffPermission("admin.dashboard.view");
}

async function requireSeoUpdate() {
  const { checkStaffPermission } = await import("@/lib/auth/staff-guards");
  return checkStaffPermission("seo.rule.update");
}

export type SeoSitemapAdminActionResult = {
  ok: boolean;
  message?: string;
};

export async function loadSeoSitemapSettingsAction() {
  const guard = await requireSeoView();
  if (!guard.ok) {
    return { ok: false as const, error: guard.error, settings: null };
  }
  const settings = await getSeoSitemapSettings();
  return { ok: true as const, error: null, settings };
}

export async function saveSeoSitemapSettingsAction(
  input: SeoSitemapSettingsUpdateInput
): Promise<SeoSitemapAdminActionResult> {
  const guard = await requireSeoUpdate();
  if (!guard.ok) {
    return { ok: false, message: guard.error };
  }

  try {
    await updateSeoSitemapSettings(input);
    revalidateSitemapSurfaces();
    return { ok: true, message: "Đã lưu cài đặt sitemap/robots." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Không lưu được cài đặt."
    };
  }
}
