"use server";

import { revalidatePath } from "next/cache";
import {
  createAnnouncement,
  createContentPost,
  createNotificationCampaign,
  sendNotificationCampaign,
  updateAnnouncement,
  updateContentPost,
  updateNotificationCampaign,
  updateSeoRule
} from "@/lib/platform-content";
import { normalizeMediaFieldForStorage } from "@/lib/media/media-resolver";
import type { ContentHubActionResult } from "@/types/admin-platform-content";

function normalizeLegacyCoverField(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) {
    return null;
  }
  const normalized = normalizeMediaFieldForStorage(value, "cover_image_url");
  if (normalized.kind === "rejected") {
    return null;
  }
  return normalized.kind === "object_key" ? normalized.objectKey : null;
}

async function requireContentHubPermission(permission: string) {
  const { checkStaffPermission } = await import("@/lib/auth/staff-guards");
  return checkStaffPermission(permission as import("@/types/permissions").PermissionCode);
}

export async function saveContentPostAction(input: {
  id?: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  cover_image_url?: string;
  category?: string;
  tags?: string;
  post_type?: string;
  status?: string;
  seo_title?: string;
  seo_description?: string;
  canonical_url?: string;
  indexable?: boolean;
}): Promise<ContentHubActionResult> {
  const staff = await requireContentHubPermission(
    input.id ? "content.post.update" : "content.post.create"
  );
  if (!staff.ok) {
    return { ok: false, message: staff.error };
  }

  const tags = input.tags
    ? input.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];
  const coverObjectKey = normalizeLegacyCoverField(input.cover_image_url);

  if (input.id) {
    const result = await updateContentPost(input.id, {
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt ?? null,
      content: input.content ?? null,
      cover_image_url: coverObjectKey,
      category: input.category || null,
      tags,
      post_type: input.post_type as import("@/types/platform-content").ContentPostType,
      status: input.status as import("@/types/platform-content").ContentPostStatus,
      seo_title: input.seo_title || null,
      seo_description: input.seo_description || null,
      canonical_url: input.canonical_url || null,
      indexable: input.indexable ?? true
    });

    if (result.error) {
      return { ok: false, message: result.error };
    }

    revalidatePath("/admin/content-hub");
    revalidatePath(`/admin/content-hub/${input.id ?? result.item?.id}`);
    revalidatePath(`/bai-viet/${input.slug}`);
    return { ok: true, message: "Đã cập nhật bài viết.", id: result.item?.id };
  }

  const result = await createContentPost({
    title: input.title,
    slug: input.slug,
    excerpt: input.excerpt ?? null,
    content: input.content ?? null,
    cover_image_url: coverObjectKey,
    category: input.category || null,
    tags,
    post_type: (input.post_type as import("@/types/platform-content").ContentPostType) ?? "article",
    status: (input.status as import("@/types/platform-content").ContentPostStatus) ?? "draft",
    seo_title: input.seo_title || null,
    seo_description: input.seo_description || null,
    canonical_url: input.canonical_url || null,
    indexable: input.indexable ?? true,
    author_admin_id: staff.userId
  });

  if (result.error) {
    return { ok: false, message: result.error };
  }

  revalidatePath("/admin/content-hub");
  return { ok: true, message: "Đã tạo bài viết.", id: result.item?.id };
}

export async function saveAnnouncementAction(input: {
  id?: string;
  title: string;
  slug: string;
  body?: string;
  announcement_type?: string;
  visibility?: string;
  status?: string;
  priority?: string;
  indexable?: boolean;
}): Promise<ContentHubActionResult> {
  const staff = await requireContentHubPermission(
    input.id ? "platform.announcement.update" : "platform.announcement.create"
  );
  if (!staff.ok) {
    return { ok: false, message: staff.error };
  }

  if (input.id) {
    const result = await updateAnnouncement(input.id, {
      title: input.title,
      slug: input.slug,
      body: input.body ?? null,
      announcement_type: input.announcement_type as import("@/types/platform-content").AnnouncementType,
      visibility: input.visibility as import("@/types/platform-content").AnnouncementVisibility,
      status: input.status as import("@/types/platform-content").AnnouncementStatus,
      priority: input.priority as import("@/types/platform-content").AnnouncementPriority,
      indexable: input.indexable ?? false
    });

    if (result.error) {
      return { ok: false, message: result.error };
    }

    revalidatePath("/admin/content-hub");
    revalidatePath(`/admin/content-hub/${input.id ?? result.item?.id}`);
    revalidatePath(`/thong-bao/${input.slug}`);
    return { ok: true, message: "Đã cập nhật thông báo.", id: result.item?.id };
  }

  const result = await createAnnouncement({
    title: input.title,
    slug: input.slug,
    body: input.body ?? null,
    announcement_type:
      (input.announcement_type as import("@/types/platform-content").AnnouncementType) ?? "general",
    visibility:
      (input.visibility as import("@/types/platform-content").AnnouncementVisibility) ?? "public",
    status: (input.status as import("@/types/platform-content").AnnouncementStatus) ?? "draft",
    priority: (input.priority as import("@/types/platform-content").AnnouncementPriority) ?? "normal",
    indexable: input.indexable ?? false
  });

  if (result.error) {
    return { ok: false, message: result.error };
  }

  revalidatePath("/admin/content-hub");
  return { ok: true, message: "Đã tạo thông báo.", id: result.item?.id };
}

export async function saveNotificationCampaignAction(input: {
  id?: string;
  title: string;
  message: string;
  notification_type?: string;
  channel_in_app?: boolean;
  channel_email?: boolean;
  target_mode?: string;
  target_segments?: string;
  status?: string;
}): Promise<ContentHubActionResult> {
  const staff = await requireContentHubPermission(
    input.id ? "notification.campaign.update" : "notification.campaign.create"
  );
  if (!staff.ok) {
    return { ok: false, message: staff.error };
  }

  const targetSegments = input.target_segments
    ? input.target_segments.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  if (input.id) {
    const result = await updateNotificationCampaign(input.id, {
      title: input.title,
      message: input.message,
      notification_type: input.notification_type as import("@/types/platform-content").CampaignNotificationType,
      channel_in_app: input.channel_in_app ?? true,
      channel_email: input.channel_email ?? false,
      target_mode: input.target_mode as import("@/types/platform-content").CampaignTargetMode,
      target_segments: targetSegments,
      status: input.status as import("@/types/platform-content").CampaignStatus
    });

    if (result.error) {
      return { ok: false, message: result.error };
    }

    revalidatePath("/admin/content-hub");
    revalidatePath(`/admin/content-hub/${input.id ?? result.item?.id}`);
    return { ok: true, message: "Đã cập nhật campaign.", id: result.item?.id };
  }

  const result = await createNotificationCampaign({
    title: input.title,
    message: input.message,
    notification_type:
      (input.notification_type as import("@/types/platform-content").CampaignNotificationType) ??
      "system",
    channel_in_app: input.channel_in_app ?? true,
    channel_email: input.channel_email ?? false,
    target_mode: (input.target_mode as import("@/types/platform-content").CampaignTargetMode) ?? "segment",
    target_segments: targetSegments,
    status: (input.status as import("@/types/platform-content").CampaignStatus) ?? "draft",
    created_by: staff.userId
  });

  if (result.error) {
    return { ok: false, message: result.error };
  }

  revalidatePath("/admin/content-hub");
  return { ok: true, message: "Đã tạo campaign.", id: result.item?.id };
}

export async function sendNotificationCampaignAction(
  campaignId: string
): Promise<ContentHubActionResult> {
  const staff = await requireContentHubPermission("notification.campaign.update");
  if (!staff.ok) {
    return { ok: false, message: staff.error };
  }

  const delivery = await sendNotificationCampaign(campaignId);

  if (delivery.error) {
    return { ok: false, message: delivery.error };
  }

  revalidatePath("/admin/content-hub");
  revalidatePath("/admin/notifications");
  return {
    ok: true,
    message: `Đã gửi ${delivery.created} thông báo in-app.`
  };
}

export async function saveSeoRuleAction(input: {
  id: string;
  indexable: boolean;
  follow_links: boolean;
  title_template?: string;
  description_template?: string;
  canonical_mode?: string;
  custom_canonical_url?: string;
  notes?: string;
}): Promise<ContentHubActionResult> {
  const staff = await requireContentHubPermission("seo.rule.update");
  if (!staff.ok) {
    return { ok: false, message: staff.error };
  }

  const result = await updateSeoRule(input.id, {
    indexable: input.indexable,
    follow_links: input.follow_links,
    title_template: input.title_template || null,
    description_template: input.description_template || null,
    canonical_mode: input.canonical_mode as import("@/types/platform-content").CanonicalMode,
    custom_canonical_url: input.custom_canonical_url || null,
    notes: input.notes || null
  });

  if (result.error) {
    return { ok: false, message: result.error };
  }

  revalidatePath("/admin/content-hub");
  revalidatePath("/admin/seo");
  revalidatePath("/admin/seo/rules");
  return { ok: true, message: "Đã cập nhật SEO rule." };
}
