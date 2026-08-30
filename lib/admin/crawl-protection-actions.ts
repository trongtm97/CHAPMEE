"use server";

import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import {
  getCrawlProtectionSettings,
  updateCrawlProtectionSettings,
  type CrawlProtectionSettings
} from "@/lib/security/crawl-protection-settings";
import { requireAdminSettingsAccess } from "@/lib/auth/require-permission";

export async function getAdminCrawlProtectionAction() {
  const guard = await requireAdminSettingsAccess("/admin/security/crawl-protection");
  if (!guard.ok) {
    return { ok: false as const, error: guard.error, settings: null };
  }
  const settings = await getCrawlProtectionSettings();
  return { ok: true as const, error: null, settings };
}

export async function updateCrawlProtectionAction(formData: FormData) {
  const guard = await requireAdminSettingsAccess("/admin/security/crawl-protection");
  if (!guard.ok) {
    return { ok: false as const, message: guard.error };
  }

  const patch: Partial<CrawlProtectionSettings> = {
    enabled: formData.get("enabled") === "on",
    readerRateLimitEnabled: formData.get("readerRateLimitEnabled") === "on",
    challengeEnabled: formData.get("challengeEnabled") === "on",
    anonymousChapterReadsPerMinute: Number(formData.get("anonymousChapterReadsPerMinute") ?? 20),
    anonymousChapterReadsPerHour: Number(formData.get("anonymousChapterReadsPerHour") ?? 200),
    loggedInChapterReadsPerMinute: Number(formData.get("loggedInChapterReadsPerMinute") ?? 60),
    loggedInChapterReadsPerHour: Number(formData.get("loggedInChapterReadsPerHour") ?? 600),
    searchRequestsPerMinute: Number(formData.get("searchRequestsPerMinute") ?? 30),
    commentRequestsPerMinute: Number(formData.get("commentRequestsPerMinute") ?? 10),
    reactionRequestsPerMinute: Number(formData.get("reactionRequestsPerMinute") ?? 30),
    reviewRequestsPerHour: Number(formData.get("reviewRequestsPerHour") ?? 10),
    blockDatacenterMode: (formData.get("blockDatacenterMode") as CrawlProtectionSettings["blockDatacenterMode"]) ?? "monitor"
  };

  const next = await updateCrawlProtectionSettings(patch);

  await logAdminAction({
    action: "update_app_settings",
    actorId: guard.context.userId,
    targetType: "crawl_protection_settings",
    targetId: "singleton",
    metadata: { enabled: next.enabled, challengeEnabled: next.challengeEnabled }
  });

  revalidatePath("/admin/security/crawl-protection");
  return { ok: true as const, message: "Đã lưu cấu hình chống crawl." };
}
