"use server";

import { revalidatePath } from "next/cache";
import { appendSeoChangeLog } from "@/lib/seo/change-logs";
import {
  createSeoRedirect,
  deleteSeoRedirect,
  getSeoRedirectById,
  updateSeoRedirect,
  validateSeoRedirectForAdmin,
  type SeoRedirectUpsertInput
} from "@/lib/seo/redirect-service";
import { invalidateSeoRedirectCache } from "@/lib/seo/redirect-cache";

const REVALIDATE_PATHS = ["/admin/seo/redirects", "/admin/seo/404-monitor"];

function revalidateRedirects(extra?: string) {
  invalidateSeoRedirectCache();
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path);
  }
  if (extra) {
    revalidatePath(extra);
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

export type SeoRedirectAdminActionResult = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  warnings?: string[];
  id?: string;
};

export async function saveSeoRedirectAction(
  input: SeoRedirectUpsertInput & { id?: string }
): Promise<SeoRedirectAdminActionResult> {
  const guard = await requireSeoUpdate();
  if (!guard.ok) {
    return { ok: false, message: guard.error };
  }

  const validation = await validateSeoRedirectForAdmin(
    {
      sourcePath: input.sourcePath,
      destinationPath: input.destinationPath,
      statusCode: input.statusCode,
      preserveQuery: input.preserveQuery,
      isEnabled: input.isEnabled
    },
    { excludeId: input.id }
  );

  if (!validation.ok) {
    return { ok: false, message: validation.error, fieldErrors: validation.fieldErrors };
  }

  const payload: SeoRedirectUpsertInput = {
    ...input,
    sourcePath: validation.normalized.sourcePath,
    destinationPath: validation.normalized.destinationPath,
    updatedBy: guard.userId,
    createdBy: guard.userId
  };

  try {
    if (input.id) {
      const before = await getSeoRedirectById(input.id);
      if (!before) {
        return { ok: false, message: "Không tìm thấy redirect." };
      }
      const after = await updateSeoRedirect(input.id, payload);
      await logSeoChange({
        entityType: "seo_redirect",
        entityId: input.id,
        action: "update",
        before: { ...before },
        after: after ? { ...after } : {},
        userId: guard.userId
      });
      revalidateRedirects(`/admin/seo/redirects/${input.id}`);
      return {
        ok: true,
        message: "Đã cập nhật redirect.",
        id: input.id,
        warnings: validation.warnings
      };
    }

    const created = await createSeoRedirect(payload);
    await logSeoChange({
      entityType: "seo_redirect",
      entityId: created.id,
      action: "create",
      after: { ...created },
      userId: guard.userId
    });
    revalidateRedirects(`/admin/seo/redirects/${created.id}`);
    return {
      ok: true,
      message: "Đã tạo redirect.",
      id: created.id,
      warnings: validation.warnings
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("unique")
        ? "source_path đã có redirect enabled khác."
        : error instanceof Error
          ? error.message
          : "Không lưu được redirect.";
    return { ok: false, message };
  }
}

export async function deleteSeoRedirectAction(id: string): Promise<SeoRedirectAdminActionResult> {
  const guard = await requireSeoUpdate();
  if (!guard.ok) {
    return { ok: false, message: guard.error };
  }

  const before = await getSeoRedirectById(id);
  if (!before) {
    return { ok: false, message: "Không tìm thấy redirect." };
  }

  await deleteSeoRedirect(id);
  await logSeoChange({
    entityType: "seo_redirect",
    entityId: id,
    action: "delete",
    before: { ...before },
    userId: guard.userId
  });
  revalidateRedirects();
  return { ok: true, message: "Đã xóa redirect." };
}

export async function loadSeoRedirectAction(id: string) {
  const guard = await requireSeoView();
  if (!guard.ok) {
    return { ok: false as const, error: guard.error, redirect: null };
  }
  const redirect = await getSeoRedirectById(id);
  return { ok: true as const, error: null, redirect };
}
