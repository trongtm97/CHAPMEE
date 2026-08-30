"use server";

import { revalidatePath } from "next/cache";
import { appendSeoChangeLog } from "@/lib/seo/change-logs";
import {
  createSeoContentBlock,
  deleteSeoContentBlock,
  getSeoContentBlockById,
  setSeoContentBlockStatus,
  updateSeoContentBlock,
  type SeoContentBlockUpsertInput
} from "@/lib/seo/seo-content-service";
import { validateSeoContentBlockForm } from "@/lib/seo/seo-validation";

const REVALIDATE_PATHS = [
  "/admin/seo/content-blocks",
  "/discover",
  "/truyen",
  "/media",
  "/bang-xep-hang"
];

function revalidateSeoContent(extra?: string) {
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

export type SeoContentAdminActionResult = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  warnings?: string[];
  id?: string;
};

export async function saveSeoContentBlockAction(
  input: SeoContentBlockUpsertInput & { id?: string }
): Promise<SeoContentAdminActionResult> {
  const guard = await requireSeoUpdate();
  if (!guard.ok) {
    return { ok: false, message: guard.error };
  }

  const validation = validateSeoContentBlockForm({
    title: input.title,
    contentMarkdown: input.contentMarkdown,
    routePath: input.routePath,
    pageType: input.pageType,
    status: input.status,
    faqJson: input.faqJson ?? undefined,
    internalLinksJson: input.internalLinksJson ?? undefined
  });

  if (!validation.ok) {
    return { ok: false, message: validation.message, fieldErrors: validation.fieldErrors };
  }

  const payload: SeoContentBlockUpsertInput = {
    ...input,
    updatedBy: guard.userId,
    createdBy: guard.userId
  };

  try {
    if (input.id) {
      const before = await getSeoContentBlockById(input.id);
      if (!before) {
        return { ok: false, message: "Không tìm thấy content block." };
      }
      const after = await updateSeoContentBlock(input.id, payload, before.publishedAt);
      await logSeoChange({
        entityType: "seo_content_block",
        entityId: input.id,
        action: "update",
        before: { ...before },
        after: after ? { ...after } : {},
        userId: guard.userId
      });
      revalidateSeoContent(`/admin/seo/content-blocks/${input.id}`);
      return {
        ok: true,
        message: "Đã cập nhật content block.",
        id: input.id,
        warnings: validation.warnings
      };
    }

    const created = await createSeoContentBlock(payload);
    await logSeoChange({
      entityType: "seo_content_block",
      entityId: created.id,
      action: "create",
      after: { ...created },
      userId: guard.userId
    });
    revalidateSeoContent(`/admin/seo/content-blocks/${created.id}`);
    return {
      ok: true,
      message: "Đã tạo content block.",
      id: created.id,
      warnings: validation.warnings
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("unique")
        ? "Đã có block published cho route/page này — hãy archive block cũ trước."
        : error instanceof Error
          ? error.message
          : "Không lưu được content block.";
    return { ok: false, message };
  }
}

export async function setSeoContentBlockStatusAction(
  id: string,
  status: "draft" | "published" | "archived"
): Promise<SeoContentAdminActionResult> {
  const guard = await requireSeoUpdate();
  if (!guard.ok) {
    return { ok: false, message: guard.error };
  }

  const before = await getSeoContentBlockById(id);
  if (!before) {
    return { ok: false, message: "Không tìm thấy content block." };
  }

  if (status === "published") {
    const validation = validateSeoContentBlockForm({
      title: before.title,
      contentMarkdown: before.contentMarkdown,
      routePath: before.routePath,
      pageType: before.pageType,
      status: "published"
    });
    if (!validation.ok) {
      return { ok: false, message: validation.message, fieldErrors: validation.fieldErrors };
    }
  }

  try {
    const after = await setSeoContentBlockStatus(id, status, guard.userId, before.publishedAt);
    await logSeoChange({
      entityType: "seo_content_block",
      entityId: id,
      action: status,
      before: { ...before },
      after: after ? { ...after } : {},
      userId: guard.userId
    });
    revalidateSeoContent(`/admin/seo/content-blocks/${id}`);
    return { ok: true, message: `Đã chuyển sang ${status}.`, id };
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("unique")
        ? "Đã có block published cho route/page này."
        : error instanceof Error
          ? error.message
          : "Không cập nhật được trạng thái.";
    return { ok: false, message };
  }
}

export async function deleteSeoContentBlockAction(id: string): Promise<SeoContentAdminActionResult> {
  const guard = await requireSeoUpdate();
  if (!guard.ok) {
    return { ok: false, message: guard.error };
  }

  const before = await getSeoContentBlockById(id);
  if (!before) {
    return { ok: false, message: "Không tìm thấy content block." };
  }

  await deleteSeoContentBlock(id);
  await logSeoChange({
    entityType: "seo_content_block",
    entityId: id,
    action: "delete",
    before: { ...before },
    userId: guard.userId
  });
  revalidateSeoContent("/admin/seo/content-blocks");
  return { ok: true, message: "Đã xóa content block." };
}

export async function loadSeoContentBlockAction(id: string) {
  const guard = await requireSeoView();
  if (!guard.ok) {
    return { ok: false as const, error: guard.error, block: null };
  }
  const block = await getSeoContentBlockById(id);
  return { ok: true as const, error: null, block };
}
