"use server";

import { revalidatePath } from "next/cache";
import { appendSeoChangeLog } from "@/lib/seo/change-logs";
import {
  createSeoOverride,
  deleteSeoOverride,
  getSeoOverrideById,
  getSeoSettingsRow,
  updateSeoOverride,
  updateSeoSettingsRow,
  type SeoOverrideUpsertInput,
  type SeoSettingsUpdateInput
} from "@/lib/seo/seo-admin-service";
import { clearSeoMediaAssetCache, resolveMediaAssetPublicUrl } from "@/lib/seo/seo-media";
import { promoteSeoOgImageAsset } from "@/lib/storage/media";
import {
  validateSeoOverrideForm,
  validateSeoSettingsForm,
  normalizeSeoPath
} from "@/lib/seo/seo-validation";

const REVALIDATE_PATHS = [
  "/admin/seo",
  "/admin/seo/settings",
  "/admin/seo/overrides"
];

function revalidateSeoCenter(extra?: string) {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path);
  }
  if (extra) {
    revalidatePath(extra);
  }
}

function revalidateSeoOverridePublicPath(path?: string | null) {
  const normalized = path?.trim() ? normalizeSeoPath(path) : null;
  if (!normalized) {
    return;
  }
  revalidatePath(normalized);
  // Trang chủ và /reels dùng chung pageType reels — làm mới cả hai khi một trong hai đổi.
  if (normalized === "/" || normalized === "/reels") {
    revalidatePath("/");
    revalidatePath("/reels");
  }
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

async function logSeoChange(input: {
  entityType: string;
  entityId?: string | null;
  action: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  userId?: string | null;
}) {
  try {
    const { createClient } = await import("@/lib/data/server");
    await appendSeoChangeLog(await createClient(), {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      before: input.before,
      after: input.after,
      changedBy: input.userId ?? null
    });
  } catch {
    // TODO: persistent audit when seo_change_logs always available in VPS DB.
  }
}

export type SeoAdminActionResult = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  id?: string;
};

export async function loadSeoSettingsAction() {
  const guard = await requireSeoView();
  if (!guard.ok) {
    return { ok: false as const, error: guard.error, settings: null };
  }
  const settings = await getSeoSettingsRow();
  return { ok: true as const, settings, error: null };
}

export async function saveSeoSettingsAction(
  input: SeoSettingsUpdateInput
): Promise<SeoAdminActionResult> {
  const guard = await requireSeoUpdate();
  if (!guard.ok) {
    return { ok: false, message: guard.error };
  }

  const validation = validateSeoSettingsForm(input);
  if (!validation.ok) {
    return { ok: false, message: validation.message, fieldErrors: validation.fieldErrors };
  }

  const before = await getSeoSettingsRow();
  const after = await updateSeoSettingsRow(input);

  // Make the chosen default OG image a permanent, library-visible asset.
  if (after.defaultOgImageAssetId) {
    try {
      await promoteSeoOgImageAsset(after.defaultOgImageAssetId);
    } catch {
      // Non-fatal: settings are saved even if asset promotion fails.
    }
  }
  clearSeoMediaAssetCache();

  await logSeoChange({
    entityType: "seo_settings",
    entityId: after.id,
    action: before ? "update" : "create",
    before: before ? { ...before } : {},
    after: { ...after },
    userId: guard.userId
  });

  revalidateSeoCenter("/admin/seo/settings");
  return { ok: true, message: "Đã lưu cài đặt SEO.", id: after.id };
}

export async function saveSeoOverrideAction(
  input: SeoOverrideUpsertInput & { id?: string }
): Promise<SeoAdminActionResult> {
  const guard = await requireSeoUpdate();
  if (!guard.ok) {
    return { ok: false, message: guard.error };
  }

  const validation = validateSeoOverrideForm(input);
  if (!validation.ok) {
    return { ok: false, message: validation.message, fieldErrors: validation.fieldErrors };
  }

  const payload: SeoOverrideUpsertInput = {
    ...input,
    updatedBy: guard.userId,
    createdBy: guard.userId
  };

  if (input.id) {
    const before = await getSeoOverrideById(input.id);
    if (!before) {
      return { ok: false, message: "Không tìm thấy override." };
    }
    const after = await updateSeoOverride(input.id, payload);
    await logSeoChange({
      entityType: "seo_override",
      entityId: input.id,
      action: "update",
      before: { ...before },
      after: after ? { ...after } : {},
      userId: guard.userId
    });
    revalidateSeoCenter(`/admin/seo/overrides/${input.id}`);
    revalidateSeoOverridePublicPath(after?.path ?? before.path);
    return { ok: true, message: "Đã cập nhật override.", id: input.id };
  }

  const created = await createSeoOverride(payload);
  await logSeoChange({
    entityType: "seo_override",
    entityId: created.id,
    action: "create",
    after: { ...created },
    userId: guard.userId
  });
  revalidateSeoCenter(`/admin/seo/overrides/${created.id}`);
  revalidateSeoOverridePublicPath(created.path);
  return { ok: true, message: "Đã tạo override.", id: created.id };
}

export async function deleteSeoOverrideAction(id: string): Promise<SeoAdminActionResult> {
  const guard = await requireSeoUpdate();
  if (!guard.ok) {
    return { ok: false, message: guard.error };
  }

  const before = await getSeoOverrideById(id);
  if (!before) {
    return { ok: false, message: "Không tìm thấy override." };
  }

  await deleteSeoOverride(id);
  await logSeoChange({
    entityType: "seo_override",
    entityId: id,
    action: "delete",
    before: { ...before },
    userId: guard.userId
  });

  revalidateSeoCenter("/admin/seo/overrides");
  revalidateSeoOverridePublicPath(before.path);
  return { ok: true, message: "Đã xóa override." };
}

export async function getMediaAssetPreviewAction(assetId: string) {
  const guard = await requireSeoView();
  if (!guard.ok) {
    return { ok: false as const, url: null, error: guard.error };
  }

  const url = await resolveMediaAssetPublicUrl(assetId);
  return { ok: true as const, url, error: null };
}
