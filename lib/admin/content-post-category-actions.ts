"use server";

import { revalidatePath } from "next/cache";
import {
  createContentPostCategory,
  getContentPostCategoryById,
  getContentPostCategoryBySlug,
  softDeleteContentPostCategory,
  updateContentPostCategory
} from "@/lib/platform-content/content-post-categories";
import {
  buildUniqueContentPostSlug,
  slugifyVietnameseTitle,
  validateContentPostSlug
} from "@/lib/platform-content/slug";
import type { ContentPostCategoryStatus, ContentPostRobots } from "@/types/platform-content";

const ADMIN_BASE = "/admin/content-hub/categories";
const PUBLIC_BASE = "/bai-viet/danh-muc";

async function requireCategoryPermission(permission: "content.post.create" | "content.post.update") {
  const { checkStaffPermission } = await import("@/lib/auth/staff-guards");
  return checkStaffPermission(permission);
}

function sanitizeInternalPath(raw: string | undefined | null) {
  const value = raw?.trim();
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  return value;
}

export type SaveContentPostCategoryInput = {
  id?: string;
  parent_id?: string | null;
  name: string;
  slug: string;
  description?: string;
  sort_order?: number;
  status?: ContentPostCategoryStatus;
  cover_media_asset_id?: string;
  cover_image_url?: string;
  seo_title?: string;
  seo_description?: string;
  canonical_url?: string;
  indexable?: boolean;
  robots?: string;
  og_title?: string;
  og_description?: string;
  og_image_media_asset_id?: string;
  og_image_url?: string;
  auto_slug?: boolean;
};

export async function suggestContentPostCategorySlugAction(name: string, excludeId?: string) {
  const base = slugifyVietnameseTitle(name);
  if (!base) return { slug: "", error: null as string | null };

  const slug = await buildUniqueContentPostSlug(base, async (candidate) => {
    const hit = await getContentPostCategoryBySlug(candidate);
    if (!hit.item) return false;
    if (excludeId && hit.item.id === excludeId) return false;
    return true;
  });

  return { slug, error: null as string | null };
}

export async function saveContentPostCategoryAction(input: SaveContentPostCategoryInput) {
  const permission = input.id ? "content.post.update" : "content.post.create";
  const staff = await requireCategoryPermission(permission);
  if (!staff.ok) return { ok: false, message: staff.error };

  const name = input.name.trim();
  if (!name) return { ok: false, message: "Tên chuyên mục không được để trống." };

  let slug = input.slug.trim();
  if (input.auto_slug || !slug) slug = slugifyVietnameseTitle(name);
  else slug = slugifyVietnameseTitle(slug.replace(/-/g, " "));

  const slugError = validateContentPostSlug(slug);
  if (slugError) return { ok: false, message: slugError };

  slug = await buildUniqueContentPostSlug(slug, async (candidate) => {
    const hit = await getContentPostCategoryBySlug(candidate);
    if (!hit.item) return false;
    if (input.id && hit.item.id === input.id) return false;
    return true;
  });

  const indexable = input.indexable ?? true;
  const payload = {
    parent_id: input.parent_id ?? null,
    name,
    slug,
    description: input.description?.trim() || null,
    sort_order: input.sort_order ?? 0,
    status: (input.status as ContentPostCategoryStatus) ?? "active",
    cover_media_asset_id: input.cover_media_asset_id?.trim() || null,
    cover_image_url: input.cover_image_url?.trim() || null,
    seo_title: input.seo_title?.trim() || null,
    seo_description: input.seo_description?.trim() || null,
    canonical_url: sanitizeInternalPath(input.canonical_url),
    indexable,
    robots:
      (input.robots as ContentPostRobots) ??
      (indexable ? ("index,follow" as const) : ("noindex,follow" as const)),
    og_title: input.og_title?.trim() || null,
    og_description: input.og_description?.trim() || null,
    og_image_media_asset_id: input.og_image_media_asset_id?.trim() || null,
    og_image_url: input.og_image_url?.trim() || null,
    updated_by: staff.ok ? staff.userId : null,
    ...(input.id ? {} : { created_by: staff.ok ? staff.userId : null })
  };

  if (input.id) {
    const existing = await getContentPostCategoryById(input.id);
    if (!existing.item) return { ok: false, message: "Không tìm thấy chuyên mục." };

    const result = await updateContentPostCategory(input.id, payload);
    if (result.error || !result.item) {
      return { ok: false, message: result.error ?? "Không thể cập nhật chuyên mục." };
    }

    revalidateCategoryPaths(result.item.slug, existing.item.slug);
    return { ok: true, message: "Đã cập nhật chuyên mục.", id: result.item.id, slug: result.item.slug };
  }

  const result = await createContentPostCategory(payload);
  if (result.error || !result.item) {
    return { ok: false, message: result.error ?? "Không thể tạo chuyên mục." };
  }

  revalidateCategoryPaths(result.item.slug);
  return { ok: true, message: "Đã tạo chuyên mục.", id: result.item.id, slug: result.item.slug };
}

export async function toggleContentPostCategoryStatusAction(input: {
  id: string;
  status: ContentPostCategoryStatus;
}) {
  const staff = await requireCategoryPermission("content.post.update");
  if (!staff.ok) return { ok: false, message: staff.error };

  const existing = await getContentPostCategoryById(input.id);
  if (!existing.item) return { ok: false, message: "Không tìm thấy chuyên mục." };

  const result = await updateContentPostCategory(input.id, {
    status: input.status,
    updated_by: staff.ok ? staff.userId : null
  });
  if (result.error || !result.item) {
    return { ok: false, message: result.error ?? "Không thể cập nhật trạng thái." };
  }

  revalidateCategoryPaths(result.item.slug);
  return {
    ok: true,
    message: input.status === "active" ? "Đã hiển thị chuyên mục." : "Đã ẩn chuyên mục.",
    id: result.item.id,
    slug: result.item.slug
  };
}

export async function softDeleteContentPostCategoryAction(id: string) {
  const staff = await requireCategoryPermission("content.post.update");
  if (!staff.ok) return { ok: false, message: staff.error };

  const existing = await getContentPostCategoryById(id);
  if (!existing.item) return { ok: false, message: "Không tìm thấy chuyên mục." };

  const result = await softDeleteContentPostCategory(id, staff.ok ? staff.userId : null);
  if (!result.ok) return { ok: false, message: result.error ?? "Không thể xóa chuyên mục." };

  revalidateCategoryPaths(existing.item.slug);
  return { ok: true, message: "Đã xóa mềm chuyên mục." };
}

function revalidateCategoryPaths(slug: string, previousSlug?: string) {
  revalidatePath(ADMIN_BASE);
  revalidatePath(`${ADMIN_BASE}/new`);
  revalidatePath(PUBLIC_BASE);
  revalidatePath("/bai-viet");
  revalidatePath(`${PUBLIC_BASE}/${slug}`);
  if (previousSlug && previousSlug !== slug) {
    revalidatePath(`${PUBLIC_BASE}/${previousSlug}`);
  }
}

