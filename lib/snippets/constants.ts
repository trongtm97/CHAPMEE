import type { SnippetType } from "@/lib/snippets/types";

export const SNIPPET_CODE_MAX_BYTES = 64 * 1024;

export const DEFAULT_EXCLUDED_ROUTE_PREFIXES = [
  "/admin",
  "/studio",
  "/login",
  "/register",
  "/payment",
  "/messages",
  "/me",
  "/checkout",
  "/coin",
  "/wallet",
  "/onboarding",
  "/write"
] as const;

export const LEGAL_ROUTE_PREFIXES = [
  "/privacy",
  "/terms",
  "/content-policy",
  "/community-guidelines",
  "/legal",
  "/contact",
  "/about"
] as const;

export const PAGE_GROUP_ROUTE_PREFIXES: Record<string, string[]> = {
  public: ["/", "/discover", "/truyen", "/bang-xep-hang"],
  legal: [...LEGAL_ROUTE_PREFIXES],
  reels: ["/reels", "/"],
  discover: ["/discover"],
  community: ["/community"],
  profile: ["/u/", "/profile/"],
  story: ["/stories/", "/truyen/"],
  chapter: ["/stories/", "/truyen/"],
  article: ["/bai-viet"]
};

export const SNIPPET_TYPE_LABELS: Record<SnippetType, string> = {
  custom_css: "CSS tuỳ chỉnh",
  head_script: "Script / HTML <head>",
  body_start_script: "Script / HTML đầu body",
  footer_script: "Script / HTML cuối trang",
  safe_html: "HTML an toàn (meta/link → head)"
};

export const SNIPPET_STATUS_LABELS: Record<string, string> = {
  draft: "Bản nháp",
  active: "Đang bật",
  inactive: "Đang tắt",
  error: "Lỗi"
};

export const APP_SETTING_SNIPPETS_KEY = "code_snippet_settings";
