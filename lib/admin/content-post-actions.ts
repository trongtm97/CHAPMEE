"use server";

import { revalidatePath } from "next/cache";
import {
  hasCriticalPublishBlockers,
  validateHeadingStructure
} from "@/lib/content-posts/seo-validation";
import {
  bulkSoftDeleteContentPosts,
  bulkUpdateContentPosts,
  createContentPost,
  duplicateContentPost,
  getContentPostById,
  getContentPostStats,
  isContentPostSlugTaken,
  listContentPostIdsByFilters,
  softDeleteContentPost,
  updateContentPost,
  updateContentPostStatus
} from "@/lib/platform-content/content-posts";
import { setCategoriesForPost } from "@/lib/platform-content/content-post-categories";
import type { ContentPostListFilters } from "@/lib/platform-content/parse-post-filters";
import {
  buildUniqueContentPostSlug,
  slugifyVietnameseTitle,
  validateContentPostSlug
} from "@/lib/platform-content/slug";
import { normalizeMediaFieldForStorage } from "@/lib/media/media-resolver";
import type { ContentPostActionResult } from "@/types/admin-content-posts";
import type {
  ContentPostRobots,
  ContentPostStatus,
  ContentPostType
} from "@/types/platform-content";

const ADMIN_LIST_PATH = "/admin/content-hub";
const PUBLIC_LIST_PATH = "/bai-viet";

async function requirePostPermission(permission: "content.post.create" | "content.post.update") {
  const { checkStaffPermission } = await import("@/lib/auth/staff-guards");
  return checkStaffPermission(permission);
}

function parseTags(raw: string | undefined) {
  return raw
    ? raw.split(",").map((tag) => tag.trim()).filter(Boolean)
    : [];
}

function parseDateTime(raw: string | undefined) {
  if (!raw?.trim()) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function sanitizeInternalPath(raw: string | undefined | null) {
  const value = raw?.trim();
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  return value;
}

export type SaveContentPostInput = {
  id?: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  cover_media_asset_id?: string;
  cover_image_url?: string;
  category?: string;
  category_ids?: string[];
  tags?: string;
  post_type?: string;
  status?: string;
  published_at?: string;
  scheduled_at?: string;
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
  force_publish?: boolean;
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

export async function getContentPostStatsAction() {
  const { checkStaffPermission } = await import("@/lib/auth/staff-guards");
  const staff = await checkStaffPermission("content.post.view");
  if (!staff.ok) return { stats: null, error: staff.error };
  return getContentPostStats();
}

export async function saveAdminContentPostAction(
  input: SaveContentPostInput
): Promise<ContentPostActionResult> {
  const permission = input.id ? "content.post.update" : "content.post.create";
  const staff = await requirePostPermission(permission);
  if (!staff.ok) return { ok: false, message: staff.error };

  const title = input.title.trim();
  if (!title) return { ok: false, message: "Tiêu đề không được để trống." };

  const status = (input.status as ContentPostStatus) ?? "draft";
  const content = input.content?.trim() || null;
  const postType = (input.post_type as ContentPostType) ?? "article";

  if (!postType) return { ok: false, message: "Loại bài bắt buộc." };

  if ((status === "published" || status === "scheduled") && !content) {
    return { ok: false, message: "Nội dung bắt buộc khi đăng hoặc lên lịch." };
  }

  if (status === "scheduled") {
    if (!input.scheduled_at?.trim()) {
      return { ok: false, message: "Thời gian lên lịch bắt buộc." };
    }
    const scheduled = new Date(input.scheduled_at);
    if (Number.isNaN(scheduled.getTime()) || scheduled.getTime() <= Date.now()) {
      return { ok: false, message: "Thời gian lên lịch phải ở tương lai." };
    }
  }

  let slug = input.slug.trim();
  if (input.auto_slug || !slug) slug = slugifyVietnameseTitle(title);
  else slug = slugifyVietnameseTitle(slug.replace(/-/g, " "));

  const slugError = validateContentPostSlug(slug);
  if (slugError) return { ok: false, message: slugError };

  slug = await buildUniqueContentPostSlug(slug, (candidate) =>
    isContentPostSlugTaken(candidate, input.id)
  );

  const indexable = input.indexable ?? true;
  if (indexable && status === "published") {
    if (!input.seo_title?.trim() || !input.seo_description?.trim()) {
      return { ok: false, message: "SEO title và description bắt buộc khi bật index và đăng bài." };
    }
  }

  if (content) {
    const headingErrors = validateHeadingStructure(content);
    if (headingErrors.length > 0) {
      return { ok: false, message: headingErrors[0] };
    }
    if (
      hasCriticalPublishBlockers({
        title,
        slug,
        excerpt: input.excerpt ?? "",
        content,
        postType,
        coverImageUrl: input.cover_media_asset_id ?? input.cover_image_url ?? "",
        seoTitle: input.seo_title ?? "",
        seoDescription: input.seo_description ?? "",
        canonicalUrl: input.canonical_url ?? "",
        indexable
      }) &&
      (status === "published" || status === "scheduled") &&
      !input.force_publish
    ) {
      return { ok: false, message: "Không thể đăng: có lỗi SEO/heading nghiêm trọng." };
    }
  }

  let coverLegacyKey: string | null = null;
  let ogLegacyKey: string | null = null;
  try {
    coverLegacyKey = legacyObjectKeyFromInput(
      input.cover_media_asset_id,
      input.cover_image_url,
      "cover_image_url"
    );
    ogLegacyKey = legacyObjectKeyFromInput(
      input.og_image_media_asset_id ?? input.cover_media_asset_id,
      input.og_image_url,
      "og_image_url"
    );
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Ảnh bìa không hợp lệ."
    };
  }

  const coverMediaAssetId = input.cover_media_asset_id?.trim() || null;
  const ogMediaAssetId =
    input.og_image_media_asset_id?.trim() || coverMediaAssetId || null;

  const payload = {
    title,
    slug,
    excerpt: input.excerpt?.trim() || null,
    content,
    cover_media_asset_id: coverMediaAssetId,
    cover_image_url: coverLegacyKey,
    category: input.category?.trim() || null,
    tags: parseTags(input.tags),
    post_type: postType,
    status,
    published_at: parseDateTime(input.published_at),
    scheduled_at: parseDateTime(input.scheduled_at),
    seo_title: input.seo_title?.trim() || null,
    seo_description: input.seo_description?.trim() || null,
    canonical_url: sanitizeInternalPath(input.canonical_url),
    indexable,
    robots: (input.robots as ContentPostRobots) ?? (indexable ? "index,follow" : "noindex,follow"),
    og_title: input.og_title?.trim() || null,
    og_description: input.og_description?.trim() || null,
    og_image_media_asset_id: ogMediaAssetId,
    og_image_url: ogLegacyKey,
    updated_by: staff.ok ? staff.userId : null
  };

  if (input.id) {
    const existing = await getContentPostById(input.id);
    if (!existing.item) return { ok: false, message: "Không tìm thấy bài viết." };

    const result = await updateContentPost(input.id, payload);
    if (result.error || !result.item) {
      return { ok: false, message: result.error ?? "Không thể cập nhật bài viết." };
    }

    if (Array.isArray(input.category_ids)) {
      const setResult = await setCategoriesForPost(result.item.id, input.category_ids);
      if (!setResult.ok) {
        return { ok: false, message: setResult.error ?? "Không thể cập nhật chuyên mục bài viết." };
      }
    }

    revalidateAdminAndPublic(result.item.slug, existing.item.slug);
    return { ok: true, message: "Đã cập nhật bài viết.", id: result.item.id, slug: result.item.slug };
  }

  const result = await createContentPost({ ...payload, author_admin_id: staff.ok ? staff.userId : null });
  if (result.error || !result.item) {
    return { ok: false, message: result.error ?? "Không thể tạo bài viết." };
  }

  if (Array.isArray(input.category_ids)) {
    const setResult = await setCategoriesForPost(result.item.id, input.category_ids);
    if (!setResult.ok) {
      return { ok: false, message: setResult.error ?? "Không thể gán chuyên mục cho bài viết." };
    }
  }

  revalidateAdminAndPublic(result.item.slug);
  return { ok: true, message: "Đã tạo bài viết.", id: result.item.id, slug: result.item.slug };
}

export async function toggleContentPostStatusAction(input: {
  id: string;
  status: ContentPostStatus;
}): Promise<ContentPostActionResult> {
  const staff = await requirePostPermission("content.post.update");
  if (!staff.ok) return { ok: false, message: staff.error };

  const existing = await getContentPostById(input.id);
  if (!existing.item) return { ok: false, message: "Không tìm thấy bài viết." };

  if (input.status === "published" && !existing.item.content?.trim()) {
    return { ok: false, message: "Không thể đăng bài thiếu nội dung." };
  }

  const result = await updateContentPostStatus(input.id, input.status);
  if (result.error || !result.item) {
    return { ok: false, message: result.error ?? "Không thể cập nhật trạng thái." };
  }

  revalidateAdminAndPublic(result.item.slug);
  return {
    ok: true,
    message:
      input.status === "published"
        ? "Đã xuất bản bài viết."
        : input.status === "hidden"
          ? "Đã ẩn bài viết."
          : input.status === "archived"
            ? "Đã lưu trữ bài viết."
            : "Đã cập nhật trạng thái.",
    id: result.item.id,
    slug: result.item.slug
  };
}

export async function softDeleteContentPostAction(id: string): Promise<ContentPostActionResult> {
  const staff = await requirePostPermission("content.post.update");
  if (!staff.ok) return { ok: false, message: staff.error };

  const existing = await getContentPostById(id);
  if (!existing.item) return { ok: false, message: "Không tìm thấy bài viết." };

  const result = await softDeleteContentPost(id);
  if (!result.ok) return { ok: false, message: result.error ?? "Không thể xóa bài viết." };

  revalidateAdminAndPublic(existing.item.slug);
  return { ok: true, message: "Đã xóa mềm bài viết." };
}

export async function duplicateContentPostAction(id: string): Promise<ContentPostActionResult> {
  const staff = await requirePostPermission("content.post.create");
  if (!staff.ok) return { ok: false, message: staff.error };

  const existing = await getContentPostById(id);
  if (!existing.item) return { ok: false, message: "Không tìm thấy bài viết." };

  const baseSlug = slugifyVietnameseTitle(`${existing.item.slug}-ban-sao`);
  const slug = await buildUniqueContentPostSlug(baseSlug, isContentPostSlugTaken);
  const result = await duplicateContentPost(id, slug);

  if (result.error || !result.item) {
    return { ok: false, message: result.error ?? "Không thể nhân bản." };
  }

  revalidateAdminAndPublic(result.item.slug);
  return { ok: true, message: "Đã nhân bản bài viết.", id: result.item.id, slug: result.item.slug };
}

export type BulkContentPostPatch = {
  status?: ContentPostStatus;
  post_type?: ContentPostType;
  indexable?: boolean;
  robots?: ContentPostRobots;
};

export async function bulkUpdateContentPostsAction(input: {
  ids: string[];
  patch: BulkContentPostPatch;
}): Promise<ContentPostActionResult & { updated?: number }> {
  const staff = await requirePostPermission("content.post.update");
  if (!staff.ok) return { ok: false, message: staff.error };
  if (input.ids.length === 0) return { ok: false, message: "Chưa chọn bài viết nào." };

  const result = await bulkUpdateContentPosts(input.ids, {
    ...input.patch,
    ...(input.patch.status === "published" ? { published_at: new Date().toISOString() } : {}),
    updated_by: staff.ok ? staff.userId : null
  });

  if (result.error) return { ok: false, message: result.error };
  revalidatePath(ADMIN_LIST_PATH);
  revalidatePath(PUBLIC_LIST_PATH);
  return { ok: true, message: `Đã cập nhật ${result.updated} bài viết.`, updated: result.updated };
}

export async function bulkSoftDeleteContentPostsAction(
  ids: string[]
): Promise<ContentPostActionResult & { deleted?: number }> {
  const staff = await requirePostPermission("content.post.update");
  if (!staff.ok) return { ok: false, message: staff.error };
  if (ids.length === 0) return { ok: false, message: "Chưa chọn bài viết nào." };

  const result = await bulkSoftDeleteContentPosts(ids);
  if (result.error) return { ok: false, message: result.error };

  revalidatePath(ADMIN_LIST_PATH);
  revalidatePath(PUBLIC_LIST_PATH);
  return { ok: true, message: `Đã xóa mềm ${result.deleted} bài viết.`, deleted: result.deleted };
}

export async function listContentPostIdsForBulkAction(filters: ContentPostListFilters) {
  const staff = await requirePostPermission("content.post.update");
  if (!staff.ok) return { ids: [], error: staff.error };
  return listContentPostIdsByFilters(filters);
}

export async function exportContentPostsCsvAction(ids: string[]) {
  const { checkStaffPermission } = await import("@/lib/auth/staff-guards");
  const staff = await checkStaffPermission("content.post.view");
  if (!staff.ok) return { csv: "", error: staff.error };

  const rows: string[] = ["id,title,slug,status,post_type,indexable,published_at,updated_at"];
  for (const id of ids) {
    const { item } = await getContentPostById(id);
    if (!item) continue;
    rows.push(
      [
        item.id,
        `"${item.title.replace(/"/g, '""')}"`,
        item.slug,
        item.status,
        item.post_type,
        item.indexable,
        item.published_at ?? "",
        item.updated_at
      ].join(",")
    );
  }
  return { csv: rows.join("\n"), error: null as string | null };
}

export async function suggestContentPostSlugAction(title: string, excludeId?: string) {
  const base = slugifyVietnameseTitle(title);
  if (!base) return { slug: "", error: null as string | null };
  const slug = await buildUniqueContentPostSlug(base, (candidate) =>
    isContentPostSlugTaken(candidate, excludeId)
  );
  return { slug, error: null as string | null };
}

function revalidateAdminAndPublic(slug: string, previousSlug?: string) {
  revalidatePath(ADMIN_LIST_PATH);
  revalidatePath(`${ADMIN_LIST_PATH}/new`);
  revalidatePath(PUBLIC_LIST_PATH);
  revalidatePath(`${PUBLIC_LIST_PATH}/${slug}`);
  if (previousSlug && previousSlug !== slug) {
    revalidatePath(`${PUBLIC_LIST_PATH}/${previousSlug}`);
  }
}
