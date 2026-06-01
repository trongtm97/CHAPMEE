export const SEO_PAGE_GROUPS = [
  { value: "public_core", label: "Trang công khai cốt lõi" },
  { value: "reels", label: "Reels" },
  { value: "discover", label: "Khám phá" },
  { value: "story_catalog", label: "Danh mục truyện" },
  { value: "story_detail", label: "Chi tiết truyện" },
  { value: "chapter", label: "Chương truyện" },
  { value: "author_profile", label: "Hồ sơ tác giả" },
  { value: "content_post_catalog", label: "Danh mục bài viết" },
  { value: "content_post", label: "Bài viết" },
  { value: "announcement_catalog", label: "Danh mục thông báo" },
  { value: "announcement_detail", label: "Chi tiết thông báo" },
  { value: "community", label: "Cộng đồng" },
  { value: "auth", label: "Đăng nhập / Đăng ký" },
  { value: "private_user", label: "Trang cá nhân riêng tư" },
  { value: "studio", label: "Studio" },
  { value: "admin", label: "Admin" },
  { value: "wallet_coin", label: "Ví / Coin" },
  { value: "settings", label: "Cài đặt" },
  { value: "messages", label: "Tin nhắn" },
  { value: "notifications", label: "Thông báo người dùng" }
] as const;

export type SeoPageGroup = (typeof SEO_PAGE_GROUPS)[number]["value"];

export type SeoHeadingRule = {
  pageGroup: SeoPageGroup;
  label: string;
  h1Source: string;
  allowedH2: string[];
  commonMistakes: string[];
  status: "ok" | "review" | "warning";
};

export const SEO_HEADING_RULES: SeoHeadingRule[] = [
  {
    pageGroup: "story_detail",
    label: "Chi tiết truyện",
    h1Source: "Tên truyện",
    allowedH2: ["Mô tả", "Danh sách chương", "Bình luận", "Truyện liên quan"],
    commonMistakes: ["Dùng H1 cho badge thể loại", "Nhiều H1 trong card list"],
    status: "ok"
  },
  {
    pageGroup: "chapter",
    label: "Chương truyện",
    h1Source: "Tên chương hoặc tên truyện + số chương",
    allowedH2: ["Nội dung", "Bình luận", "Chương khác"],
    commonMistakes: ["H1 trùng với tiêu đề truyện ở sidebar", "Heading cho nút điều hướng"],
    status: "ok"
  },
  {
    pageGroup: "author_profile",
    label: "Hồ sơ tác giả",
    h1Source: "Tên hiển thị tác giả",
    allowedH2: ["Truyện", "Hoạt động", "Bộ sưu tập"],
    commonMistakes: ["H1 là username thay vì display name", "Heading cho stat chip"],
    status: "ok"
  },
  {
    pageGroup: "content_post",
    label: "Bài viết Content Hub",
    h1Source: "Tiêu đề bài viết",
    allowedH2: ["Mục lục section", "FAQ", "Bài liên quan"],
    commonMistakes: ["Dùng H1 trong markdown editor preview", "H2 lồng sai thứ tự"],
    status: "review"
  },
  {
    pageGroup: "announcement_detail",
    label: "Thông báo nền tảng",
    h1Source: "Tiêu đề thông báo",
    allowedH2: ["Nội dung chính", "Liên quan"],
    commonMistakes: ["H1 cho loại thông báo badge", "Duplicate H1 với header trang"],
    status: "ok"
  },
  {
    pageGroup: "discover",
    label: "Khám phá / catalog",
    h1Source: "Tiêu đề danh mục / trang",
    allowedH2: ["Section feed", "Bộ lọc", "Gợi ý"],
    commonMistakes: ["H1 trên từng card truyện", "Heading cho tab filter"],
    status: "review"
  },
  {
    pageGroup: "studio",
    label: "Studio",
    h1Source: "Tiêu đề trang workspace (accessibility)",
    allowedH2: ["Section chính", "Sidebar panel"],
    commonMistakes: ["Indexable H1 công khai", "H1 trên logo/menu"],
    status: "warning"
  },
  {
    pageGroup: "admin",
    label: "Admin",
    h1Source: "Tiêu đề trang admin (noindex)",
    allowedH2: ["Section quản trị"],
    commonMistakes: ["Cho phép index admin", "Heading cho button thao tác"],
    status: "warning"
  }
];

export type SeoMetadataTemplate = {
  pageGroup: SeoPageGroup;
  label: string;
  titleTemplate: string;
  descriptionTemplate: string;
  variables: string[];
};

export const SEO_METADATA_TEMPLATES: SeoMetadataTemplate[] = [
  {
    pageGroup: "story_detail",
    label: "Chi tiết truyện",
    titleTemplate: "{story_title} - Truyện {genre} | ChapMee",
    descriptionTemplate: "Đọc {story_title} của {author_name}. {short_description}",
    variables: ["story_title", "genre", "author_name", "short_description"]
  },
  {
    pageGroup: "chapter",
    label: "Chương truyện",
    titleTemplate: "{chapter_title} - {story_title} | ChapMee",
    descriptionTemplate: "Đọc chương {chapter_number} truyện {story_title} trên ChapMee.",
    variables: ["chapter_title", "chapter_number", "story_title"]
  },
  {
    pageGroup: "author_profile",
    label: "Tác giả",
    titleTemplate: "{author_name} - Hồ sơ tác giả | ChapMee",
    descriptionTemplate: "Khám phá truyện và hoạt động của {author_name} trên ChapMee.",
    variables: ["author_name"]
  },
  {
    pageGroup: "content_post",
    label: "Bài viết",
    titleTemplate: "{post_title} | ChapMee",
    descriptionTemplate: "{post_excerpt}",
    variables: ["post_title", "post_excerpt"]
  },
  {
    pageGroup: "announcement_detail",
    label: "Thông báo",
    titleTemplate: "{announcement_title} | ChapMee",
    descriptionTemplate: "{announcement_excerpt}",
    variables: ["announcement_title", "announcement_excerpt"]
  },
  {
    pageGroup: "discover",
    label: "Khám phá",
    titleTemplate: "Khám phá truyện hay | ChapMee",
    descriptionTemplate: "Tìm truyện, tác giả và thể loại yêu thích trên ChapMee.",
    variables: []
  }
];

export const SEO_TEMPLATE_VARIABLE_PATTERN = /^\{[a-z0-9_]+\}$/i;

export function validateMetadataTemplate(template: string, allowedVariables: string[]): string | null {
  const matches = template.match(/\{[a-z0-9_]+\}/gi) ?? [];
  for (const token of matches) {
    const name = token.slice(1, -1);
    if (!allowedVariables.includes(name)) {
      return `Biến không hợp lệ: ${token}`;
    }
  }
  return null;
}

export function previewMetadataTemplate(
  template: string,
  sample: Record<string, string>
): string {
  return template.replace(/\{([a-z0-9_]+)\}/gi, (_, key: string) => sample[key] ?? `{${key}}`);
}

export const SEO_SENSITIVE_ROUTE_PATTERNS = [
  "/admin",
  "/admin/*",
  "/studio",
  "/studio/*",
  "/me",
  "/me/*",
  "/settings",
  "/settings/*",
  "/messages",
  "/messages/*",
  "/notifications",
  "/notifications/*",
  "/wallet",
  "/wallet/*",
  "/coin",
  "/coin/*",
  "/login",
  "/register"
] as const;

export function isSensitiveSeoRoute(pattern: string): boolean {
  const normalized = pattern.trim().toLowerCase();
  return SEO_SENSITIVE_ROUTE_PATTERNS.some(
    (item) => normalized === item.toLowerCase() || normalized.startsWith(item.replace("*", "").toLowerCase())
  );
}

export function validateSeoRuleIndexable(input: {
  routePattern: string;
  indexable: boolean;
}): string | null {
  if (input.indexable && isSensitiveSeoRoute(input.routePattern)) {
    return "Không được bật index cho route nhạy cảm (admin, studio, me, wallet, messages, notifications, settings).";
  }
  return null;
}

export function validateCustomCanonicalUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith("/")) return null;
  try {
    const parsed = new URL(trimmed);
    if (!parsed.hostname.includes("chapmee") && !parsed.hostname.includes("localhost")) {
      return "Canonical custom chỉ được trỏ domain ChapMee hoặc đường dẫn nội bộ /.";
    }
  } catch {
    return "Canonical URL không hợp lệ.";
  }
  return null;
}
