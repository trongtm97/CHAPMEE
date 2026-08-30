"use server";

import { revalidatePath } from "next/cache";
import {
  bulkDeleteAnnouncements,
  bulkUpdateAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  duplicateAnnouncement,
  getAnnouncementById,
  getAnnouncementStats,
  isAnnouncementSlugTaken,
  listAnnouncementIdsByFilters,
  updateAnnouncement,
  updateAnnouncementStatus
} from "@/lib/platform-content/announcements";
import {
  buildUniqueContentPostSlug,
  slugifyVietnameseTitle,
  validateContentPostSlug
} from "@/lib/platform-content/slug";
import type { AnnouncementListFilters } from "@/lib/platform-content/parse-announcement-filters";
import { normalizeMediaFieldForStorage } from "@/lib/media/media-resolver";
import type { AnnouncementActionResult } from "@/types/admin-announcements";
import type {
  AnnouncementAudienceType,
  AnnouncementPriority,
  AnnouncementStatus,
  AnnouncementType,
  AnnouncementVisibility
} from "@/types/platform-content";

const ADMIN_LIST_PATH = "/admin/announcements";
const PUBLIC_LIST_PATH = "/thong-bao";

async function requireAnnouncementPermission(
  permission: "platform.announcement.create" | "platform.announcement.update"
) {
  const { checkStaffPermission } = await import("@/lib/auth/staff-guards");
  return checkStaffPermission(permission);
}

function parseDateTime(raw: string | undefined) {
  if (!raw?.trim()) {
    return null;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function sanitizeInternalPath(raw: string | undefined | null) {
  const value = raw?.trim();
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  return value;
}

export type SaveAnnouncementInput = {
  id?: string;
  title: string;
  slug: string;
  excerpt?: string;
  body?: string;
  announcement_type?: string;
  visibility?: string;
  status?: string;
  priority?: string;
  audience_type?: string;
  scheduled_at?: string;
  expires_at?: string;
  indexable?: boolean;
  follow_links?: boolean;
  seo_title?: string;
  seo_description?: string;
  canonical_path?: string;
  og_title?: string;
  og_description?: string;
  og_image_url?: string;
  og_image_media_asset_id?: string;
  auto_slug?: boolean;
  confirm_critical?: boolean;
};

function legacyObjectKeyFromInput(
  mediaAssetId: string | undefined,
  legacyUrl: string | undefined,
  context: string
): string | null {
  if (mediaAssetId?.trim()) {
    return null;
  }
  const raw = legacyUrl?.trim();
  if (!raw) {
    return null;
  }
  const normalized = normalizeMediaFieldForStorage(raw, context);
  if (normalized.kind === "rejected") {
    throw new Error(normalized.reason);
  }
  return normalized.kind === "object_key" ? normalized.objectKey : null;
}

export async function getAnnouncementStatsAction() {
  const { checkStaffPermission } = await import("@/lib/auth/staff-guards");
  const staff = await checkStaffPermission("platform.announcement.view");
  if (!staff.ok) {
    return { stats: null, error: staff.error };
  }
  return getAnnouncementStats();
}

export async function saveAdminAnnouncementAction(
  input: SaveAnnouncementInput
): Promise<AnnouncementActionResult> {
  const permission = input.id ? "platform.announcement.update" : "platform.announcement.create";
  const staff = await requireAnnouncementPermission(permission);

  if (!staff.ok) {
    return { ok: false, message: staff.error };
  }

  const title = input.title.trim();
  if (!title) {
    return { ok: false, message: "Tiêu đề không được để trống." };
  }

  const status = (input.status as AnnouncementStatus) ?? "draft";
  const visibility = (input.visibility as AnnouncementVisibility) ?? "public";
  const body = input.body?.trim() || null;

  if ((status === "published" || status === "scheduled") && !body) {
    return { ok: false, message: "Nội dung body bắt buộc khi đăng hoặc lên lịch." };
  }

  if (status === "scheduled" && !input.scheduled_at?.trim()) {
    return { ok: false, message: "Thời gian lên lịch bắt buộc khi trạng thái là Scheduled." };
  }

  let slug = input.slug.trim();
  if (input.auto_slug || !slug) {
    slug = slugifyVietnameseTitle(title);
  } else {
    slug = slugifyVietnameseTitle(slug.replace(/-/g, " "));
  }

  if (visibility === "public" && !slug) {
    return { ok: false, message: "Slug bắt buộc khi thông báo public." };
  }

  const slugError = validateContentPostSlug(slug);
  if (slugError) {
    return { ok: false, message: slugError };
  }

  const priority = (input.priority as AnnouncementPriority) ?? "normal";
  if (
    priority === "critical" &&
    !input.confirm_critical &&
    (status === "published" || status === "scheduled") &&
    visibility === "public"
  ) {
    return {
      ok: false,
      message: "Mức Critical với hiển thị rộng cần xác nhận trước khi đăng."
    };
  }

  slug = await buildUniqueContentPostSlug(slug, (candidate) =>
    isAnnouncementSlugTaken(candidate, input.id)
  );

  const indexable = input.indexable ?? false;
  if (indexable && !input.seo_title?.trim()) {
    // Allow save but warn — client shows warning; publish still allowed with fallback title
  }

  let ogLegacyKey: string | null = null;
  try {
    ogLegacyKey = legacyObjectKeyFromInput(
      input.og_image_media_asset_id,
      input.og_image_url,
      "og_image_url"
    );
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "OG image không hợp lệ."
    };
  }

  const ogMediaAssetId = input.og_image_media_asset_id?.trim() || null;

  const payload = {
    title,
    slug,
    excerpt: input.excerpt?.trim() || null,
    body,
    announcement_type: (input.announcement_type as AnnouncementType) ?? "general",
    visibility,
    status,
    priority,
    audience_type: (input.audience_type as AnnouncementAudienceType) ?? "all",
    scheduled_at: parseDateTime(input.scheduled_at),
    expires_at: parseDateTime(input.expires_at),
    indexable,
    follow_links: input.follow_links ?? true,
    seo_title: input.seo_title?.trim() || null,
    seo_description: input.seo_description?.trim() || null,
    canonical_path: sanitizeInternalPath(input.canonical_path),
    og_title: input.og_title?.trim() || null,
    og_description: input.og_description?.trim() || null,
    og_image_media_asset_id: ogMediaAssetId,
    og_image_url: ogLegacyKey,
    updated_by: staff.ok ? staff.userId : null
  };

  if (input.id) {
    const existing = await getAnnouncementById(input.id);
    if (!existing.item) {
      return { ok: false, message: "Không tìm thấy thông báo." };
    }

    const result = await updateAnnouncement(input.id, payload);
    if (result.error || !result.item) {
      return { ok: false, message: result.error ?? "Không thể cập nhật thông báo." };
    }

    revalidateAnnouncementPaths(result.item.slug, existing.item.slug);
    return {
      ok: true,
      message: indexable && !input.seo_title?.trim()
        ? "Đã cập nhật. Cảnh báo: bật index nhưng thiếu SEO title."
        : "Đã cập nhật thông báo.",
      id: result.item.id,
      slug: result.item.slug
    };
  }

  const result = await createAnnouncement({
    ...payload,
    created_by: staff.ok ? staff.userId : null
  });
  if (result.error || !result.item) {
    return { ok: false, message: result.error ?? "Không thể tạo thông báo." };
  }

  revalidateAnnouncementPaths(result.item.slug);
  return {
    ok: true,
    message: "Đã tạo thông báo.",
    id: result.item.id,
    slug: result.item.slug
  };
}

export async function toggleAnnouncementStatusAction(input: {
  id: string;
  status: AnnouncementStatus;
}): Promise<AnnouncementActionResult> {
  const staff = await requireAnnouncementPermission("platform.announcement.update");
  if (!staff.ok) {
    return { ok: false, message: staff.error };
  }

  const existing = await getAnnouncementById(input.id);
  if (!existing.item) {
    return { ok: false, message: "Không tìm thấy thông báo." };
  }

  if (input.status === "published" && !existing.item.body?.trim()) {
    return { ok: false, message: "Không thể đăng thông báo thiếu nội dung." };
  }

  const result = await updateAnnouncementStatus(input.id, input.status);
  if (result.error || !result.item) {
    return { ok: false, message: result.error ?? "Không thể cập nhật trạng thái." };
  }

  revalidateAnnouncementPaths(result.item.slug);
  return {
    ok: true,
    message:
      input.status === "published"
        ? "Đã xuất bản thông báo."
        : input.status === "hidden"
          ? "Đã ẩn thông báo."
          : input.status === "archived"
            ? "Đã lưu trữ thông báo."
            : "Đã cập nhật trạng thái.",
    id: result.item.id,
    slug: result.item.slug
  };
}

export async function deleteAnnouncementAction(id: string): Promise<AnnouncementActionResult> {
  const staff = await requireAnnouncementPermission("platform.announcement.update");
  if (!staff.ok) {
    return { ok: false, message: staff.error };
  }

  const existing = await getAnnouncementById(id);
  if (!existing.item) {
    return { ok: false, message: "Không tìm thấy thông báo." };
  }

  const result = await deleteAnnouncement(id);
  if (!result.ok) {
    return { ok: false, message: result.error ?? "Không thể xóa thông báo." };
  }

  revalidateAnnouncementPaths(existing.item.slug);
  return { ok: true, message: "Đã xóa thông báo." };
}

export async function duplicateAnnouncementAction(id: string): Promise<AnnouncementActionResult> {
  const staff = await requireAnnouncementPermission("platform.announcement.create");
  if (!staff.ok) {
    return { ok: false, message: staff.error };
  }

  const existing = await getAnnouncementById(id);
  if (!existing.item) {
    return { ok: false, message: "Không tìm thấy thông báo." };
  }

  const baseSlug = slugifyVietnameseTitle(`${existing.item.slug}-ban-sao`);
  const slug = await buildUniqueContentPostSlug(baseSlug, isAnnouncementSlugTaken);

  const result = await duplicateAnnouncement(id, slug);
  if (result.error || !result.item) {
    return { ok: false, message: result.error ?? "Không thể nhân bản." };
  }

  revalidateAnnouncementPaths(result.item.slug);
  return {
    ok: true,
    message: "Đã nhân bản thông báo.",
    id: result.item.id,
    slug: result.item.slug
  };
}

export type BulkAnnouncementPatch = {
  status?: AnnouncementStatus;
  announcement_type?: AnnouncementType;
  audience_type?: AnnouncementAudienceType;
  visibility?: AnnouncementVisibility;
  indexable?: boolean;
};

export async function bulkUpdateAnnouncementsAction(input: {
  ids: string[];
  patch: BulkAnnouncementPatch;
}): Promise<AnnouncementActionResult & { updated?: number }> {
  const staff = await requireAnnouncementPermission("platform.announcement.update");
  if (!staff.ok) {
    return { ok: false, message: staff.error };
  }

  if (input.ids.length === 0) {
    return { ok: false, message: "Chưa chọn thông báo nào." };
  }

  const patch = { ...input.patch };
  if (patch.status === "published") {
    patch.status = "published";
  }

  const result = await bulkUpdateAnnouncements(input.ids, {
    ...patch,
    ...(patch.status === "published" ? { published_at: new Date().toISOString() } : {}),
    updated_by: staff.ok ? staff.userId : null
  });

  if (result.error) {
    return { ok: false, message: result.error };
  }

  revalidatePath(ADMIN_LIST_PATH);
  revalidatePath(PUBLIC_LIST_PATH);
  return {
    ok: true,
    message: `Đã cập nhật ${result.updated} thông báo.`,
    updated: result.updated
  };
}

export async function bulkDeleteAnnouncementsAction(
  ids: string[]
): Promise<AnnouncementActionResult & { deleted?: number }> {
  const staff = await requireAnnouncementPermission("platform.announcement.update");
  if (!staff.ok) {
    return { ok: false, message: staff.error };
  }

  if (ids.length === 0) {
    return { ok: false, message: "Chưa chọn thông báo nào." };
  }

  const result = await bulkDeleteAnnouncements(ids);
  if (result.error) {
    return { ok: false, message: result.error };
  }

  revalidatePath(ADMIN_LIST_PATH);
  revalidatePath(PUBLIC_LIST_PATH);
  return {
    ok: true,
    message: `Đã xóa ${result.deleted} thông báo.`,
    deleted: result.deleted
  };
}

export async function listAnnouncementIdsForBulkAction(
  filters: AnnouncementListFilters
): Promise<{ ids: string[]; error: string | null }> {
  const staff = await requireAnnouncementPermission("platform.announcement.update");
  if (!staff.ok) {
    return { ids: [], error: staff.error };
  }
  return listAnnouncementIdsByFilters(filters);
}

export async function suggestAnnouncementSlugAction(title: string, excludeId?: string) {
  const base = slugifyVietnameseTitle(title);
  if (!base) {
    return { slug: "", error: null as string | null };
  }

  const slug = await buildUniqueContentPostSlug(base, (candidate) =>
    isAnnouncementSlugTaken(candidate, excludeId)
  );

  return { slug, error: null as string | null };
}

function revalidateAnnouncementPaths(slug: string, previousSlug?: string) {
  revalidatePath(ADMIN_LIST_PATH);
  revalidatePath(`${ADMIN_LIST_PATH}/new`);
  revalidatePath(PUBLIC_LIST_PATH);
  revalidatePath(`${PUBLIC_LIST_PATH}/${slug}`);

  if (previousSlug && previousSlug !== slug) {
    revalidatePath(`${PUBLIC_LIST_PATH}/${previousSlug}`);
  }
}
