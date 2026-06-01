export const SEO_TEMPLATE_VARIABLES = [
  "site_name",
  "story_title",
  "chapter_title",
  "chapter_number",
  "author_name",
  "category_name",
  "genre_name",
  "reels_title",
  "post_title",
  "post_excerpt",
  "announcement_title",
  "short_description",
  "current_year"
] as const;

import { SEO_PREVIEW_SAMPLE_DATA } from "@/lib/seo/seo-preview-samples";

const SAMPLE_DATA: Record<string, string> = SEO_PREVIEW_SAMPLE_DATA;

export function previewSeoTemplate(template: string | null): string {
  if (!template) return "";
  return template.replace(/\{\{([a-z0-9_]+)\}\}/gi, (_, key: string) => SAMPLE_DATA[key] ?? `{{${key}}}`);
}

export function validateTemplateLength(title: string | null, description: string | null): string[] {
  const errors: string[] = [];
  if (title) {
    const preview = previewSeoTemplate(title);
    if (preview.length < 30) errors.push("Title preview ngắn hơn 30 ký tự.");
    if (preview.length > 65) errors.push("Title preview dài hơn 65 ký tự.");
  }
  if (description) {
    const preview = previewSeoTemplate(description);
    if (preview.length < 80) errors.push("Description preview ngắn hơn 80 ký tự.");
    if (preview.length > 160) errors.push("Description preview dài hơn 160 ký tự.");
  }
  return errors;
}

export const PAGE_TYPE_LABELS: Record<string, string> = {
  story: "Truyện",
  chapter: "Chương",
  author: "Tác giả",
  reels: "Reels",
  discover: "Khám phá",
  content_post: "Bài viết",
  category: "Thể loại",
  ranking: "Bảng xếp hạng",
  community: "Cộng đồng",
  announcement: "Thông báo",
  admin: "Admin",
  studio: "Studio",
  auth: "Auth",
  wallet: "Ví",
  messages: "Tin nhắn",
  notifications: "Thông báo app",
  settings: "Cài đặt",
  private_user: "Trang cá nhân",
  search: "Tìm kiếm",
  system: "Hệ thống"
};
