"use server";

import { revalidatePath } from "next/cache";
import { appendSeoChangeLog } from "@/lib/seo/change-logs";
import { loadSeoControlCenterData } from "@/lib/admin/seo-control-data";
import { validateCustomCanonicalUrl, validateSeoRuleIndexable } from "@/lib/seo/content-hub-seo-data";
import { validateSeoRoutePattern } from "@/lib/seo/rule-validation";
import { getSeoRuleById, updateSeoRuleInDb } from "@/lib/seo/rules";
import type { SeoRuleActionResult } from "@/types/admin-seo";
import type { CanonicalMode } from "@/types/platform-content";

const SEO_PATHS = ["/admin/seo", "/admin/seo/rules", "/admin/seo/audit", "/admin/content-hub/platform"];

function revalidateSeoPaths(ruleId?: string) {
  for (const path of SEO_PATHS) {
    revalidatePath(path);
  }
  if (ruleId) {
    revalidatePath(`/admin/seo/rules/${ruleId}`);
  }
}

async function requireSeoViewAccess() {
  const { checkStaffPermission } = await import("@/lib/auth/staff-guards");
  const view = await checkStaffPermission("seo.rule.view");
  if (view.ok) {
    return view;
  }
  return checkStaffPermission("admin.dashboard.view");
}

export async function loadSeoDashboardAction() {
  return loadSeoControlCenterData();
}

export type SaveSeoRuleInput = {
  id: string;
  route_pattern?: string;
  page_type?: string;
  indexable: boolean;
  follow_links: boolean;
  include_sitemap?: boolean;
  title_template?: string;
  description_template?: string;
  canonical_mode?: string;
  custom_canonical_url?: string;
  priority?: number;
  change_frequency?: string;
  is_active?: boolean;
  notes?: string;
  allowPatternEdit?: boolean;
};

export async function saveAdminSeoRuleAction(input: SaveSeoRuleInput): Promise<SeoRuleActionResult> {
  const { checkStaffPermission } = await import("@/lib/auth/staff-guards");
  const staff = await checkStaffPermission("seo.rule.update");
  if (!staff.ok) {
    return { ok: false, message: staff.error };
  }

  const existing = await getSeoRuleById(input.id);
  if (!existing.item) {
    return { ok: false, message: "Không tìm thấy SEO rule." };
  }

  const payload: Parameters<typeof updateSeoRuleInDb>[1] = {
    page_type: input.page_type?.trim() || existing.item.page_type,
    indexable: input.indexable,
    follow_links: input.follow_links,
    include_sitemap: input.include_sitemap ?? existing.item.include_sitemap,
    title_template: input.title_template?.trim() || null,
    description_template: input.description_template?.trim() || null,
    canonical_mode: (input.canonical_mode as CanonicalMode) ?? existing.item.canonical_mode,
    custom_canonical_url: input.custom_canonical_url?.trim() || null,
    priority: input.priority ?? existing.item.priority,
    change_frequency: input.change_frequency ?? existing.item.change_frequency,
    is_active: input.is_active ?? existing.item.is_active,
    notes: input.notes?.trim() || null
  };

  const routePattern = input.allowPatternEdit && input.route_pattern?.trim()
    ? input.route_pattern.trim()
    : existing.item.route_pattern;

  const indexError = validateSeoRuleIndexable({
    routePattern,
    indexable: payload.indexable ?? existing.item.indexable
  });
  if (indexError) {
    return { ok: false, message: indexError };
  }

  const canonicalError = validateCustomCanonicalUrl(payload.custom_canonical_url);
  if (canonicalError) {
    return { ok: false, message: canonicalError };
  }

  if (
    payload.indexable &&
    !payload.title_template?.trim() &&
    !existing.item.title_template?.trim()
  ) {
    return {
      ok: false,
      message: "Route public nên có title template — thêm template hoặc tắt index."
    };
  }

  if (input.allowPatternEdit && input.route_pattern?.trim()) {
    const patternError = validateSeoRoutePattern(input.route_pattern);
    if (patternError) {
      return { ok: false, message: patternError };
    }
    payload.route_pattern = input.route_pattern.trim();
  }

  const canonicalMode = payload.canonical_mode ?? existing.item.canonical_mode;
  if (canonicalMode === "custom" && !payload.custom_canonical_url) {
    return { ok: false, message: "Custom canonical URL là bắt buộc khi canonical mode = custom." };
  }

  const result = await updateSeoRuleInDb(input.id, {
    ...payload,
    updated_by: staff.userId
  });
  if (result.error) {
    return { ok: false, message: result.error };
  }

  const { createClient } = await import("@/lib/supabase/server");
  await appendSeoChangeLog(await createClient(), {
    entityType: "seo_rule",
    entityId: input.id,
    action: "update_rule",
    before: existing.item as unknown as Record<string, unknown>,
    after: payload as Record<string, unknown>,
    changedBy: staff.userId
  });

  revalidateSeoPaths(input.id);
  return { ok: true, message: "Đã cập nhật SEO rule." };
}
