import {
  SEO_REDIRECT_STATUS_CODES,
  SEO_TARGET_TYPES,
  type SeoRedirectStatusCode,
  type SeoTargetType
} from "@/lib/seo/seo-constants";
import type { SeoRedirectInput, SeoRedirectValidationResult } from "@/lib/seo/seo-types";

const INTERNAL_PATH_REGEX = /^\/[^\s?#]*$/;
const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

export function normalizeSeoPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) {
    return "/";
  }

  let normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  normalized = normalized.split("?")[0]?.split("#")[0] ?? normalized;

  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }

  return normalized || "/";
}

export function validateSeoInternalPath(path: string): string | null {
  const normalized = normalizeSeoPath(path);

  if (!normalized.startsWith("/")) {
    return "Đường dẫn phải bắt đầu bằng /.";
  }

  if (/\s/.test(normalized)) {
    return "Đường dẫn không được chứa khoảng trắng.";
  }

  if (!INTERNAL_PATH_REGEX.test(normalized)) {
    return "Đường dẫn nội bộ không hợp lệ.";
  }

  return null;
}

export function validateSeoDestinationPath(path: string): string | null {
  const trimmed = path.trim();
  if (!trimmed) {
    return "destination_path không được để trống.";
  }

  if (ABSOLUTE_URL_REGEX.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return "URL đích chỉ hỗ trợ http/https.";
      }
      return null;
    } catch {
      return "URL đích không hợp lệ.";
    }
  }

  return validateSeoInternalPath(trimmed);
}

export function isSeoRedirectStatusCode(value: number): value is SeoRedirectStatusCode {
  return (SEO_REDIRECT_STATUS_CODES as readonly number[]).includes(value);
}

export function isSeoTargetType(value: string): value is SeoTargetType {
  return (SEO_TARGET_TYPES as readonly string[]).includes(value);
}

export function validateSeoRedirectInput(
  input: SeoRedirectInput
): SeoRedirectValidationResult {
  const sourceError = validateSeoInternalPath(input.sourcePath);
  if (sourceError) {
    return { ok: false, error: `source_path: ${sourceError}` };
  }

  const destError = validateSeoDestinationPath(input.destinationPath);
  if (destError) {
    return { ok: false, error: `destination_path: ${destError}` };
  }

  const sourcePath = normalizeSeoPath(input.sourcePath);
  const destinationPath = ABSOLUTE_URL_REGEX.test(input.destinationPath.trim())
    ? input.destinationPath.trim()
    : normalizeSeoPath(input.destinationPath);

  if (sourcePath === destinationPath) {
    return { ok: false, error: "source_path và destination_path không được giống nhau." };
  }

  if (input.statusCode != null && !isSeoRedirectStatusCode(input.statusCode)) {
    return { ok: false, error: "status_code phải là 301, 302, 307 hoặc 308." };
  }

  return { ok: true, normalized: { sourcePath, destinationPath } };
}

export function validateSeoOverrideTarget(input: {
  targetType: string;
  targetId?: string | null;
  path?: string | null;
}): string | null {
  if (!isSeoTargetType(input.targetType)) {
    return "target_type không hợp lệ.";
  }

  const hasPath = Boolean(input.path?.trim());
  const hasTargetId = Boolean(input.targetId?.trim());

  if (!hasPath && !hasTargetId) {
    return "Cần path hoặc target_id.";
  }

  if (hasPath) {
    const pathError = validateSeoInternalPath(input.path!);
    if (pathError) {
      return pathError;
    }
  }

  return null;
}

export function validateSeoCanonicalUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.startsWith("/")) {
    return validateSeoInternalPath(trimmed);
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "canonical_url chỉ hỗ trợ http/https hoặc path nội bộ.";
    }
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) {
      return "canonical_url không được trỏ tới localhost.";
    }
    return null;
  } catch {
    return "canonical_url không hợp lệ.";
  }
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateMediaAssetId(value: string | null | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }
  if (!UUID_REGEX.test(value.trim())) {
    return "media_asset_id không hợp lệ.";
  }
  return null;
}

export function warnAdminSeoTitleLength(title: string | null | undefined): string[] {
  const text = title?.trim() ?? "";
  if (!text) {
    return ["Thiếu title."];
  }
  if (text.length > 60) {
    return [`Title dài (${text.length} ký tự; khuyến nghị ≤ 60).`];
  }
  return [];
}

export function warnAdminSeoDescriptionLength(description: string | null | undefined): string[] {
  const text = description?.trim() ?? "";
  if (!text) {
    return ["Thiếu meta description."];
  }
  if (text.length > 160) {
    return [`Description dài (${text.length} ký tự; khuyến nghị ≤ 160).`];
  }
  return [];
}

export function isPrivateSeoPath(path: string | null | undefined): boolean {
  if (!path?.trim()) {
    return false;
  }
  const normalized = normalizeSeoPath(path);
  const privatePrefixes = [
    "/admin",
    "/studio",
    "/me",
    "/messages",
    "/login",
    "/register",
    "/payment",
    "/wallet",
    "/checkout",
    "/coin",
    "/onboarding",
    "/settings"
  ];
  return privatePrefixes.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
  );
}

export function validateSeoSettingsForm(input: {
  siteName: string;
  defaultTitleTemplate: string;
  defaultDescriptionTemplate: string;
  titleSeparator?: string;
  defaultOgImageAssetId?: string | null;
}): { ok: true } | { ok: false; message: string; fieldErrors?: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};

  if (!input.siteName?.trim()) {
    fieldErrors.siteName = "site_name không được để trống.";
  }
  if (!input.defaultTitleTemplate?.trim()) {
    fieldErrors.defaultTitleTemplate = "default_title_template không được để trống.";
  }
  if (!input.defaultDescriptionTemplate?.trim()) {
    fieldErrors.defaultDescriptionTemplate = "default_description_template không được để trống.";
  }

  const ogError = validateMediaAssetId(input.defaultOgImageAssetId);
  if (ogError) {
    fieldErrors.defaultOgImageAssetId = ogError;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Vui lòng sửa lỗi form.", fieldErrors };
  }

  return { ok: true };
}

export function validateSeoOverrideForm(input: {
  targetType: string;
  targetId?: string | null;
  path?: string | null;
  canonicalUrl?: string | null;
  ogImageAssetId?: string | null;
  twitterImageAssetId?: string | null;
}): { ok: true; warnings: string[] } | { ok: false; message: string; fieldErrors?: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  const warnings: string[] = [];

  if (!isSeoTargetType(input.targetType)) {
    fieldErrors.targetType = "target_type không hợp lệ.";
  }

  const hasPath = Boolean(input.path?.trim());
  const hasTargetId = Boolean(input.targetId?.trim());
  if (!hasPath && !hasTargetId) {
    fieldErrors.path = "Cần path hoặc target_id.";
  }

  if (hasPath) {
    const pathError = validateSeoInternalPath(input.path!);
    if (pathError) {
      fieldErrors.path = pathError;
    } else if (isPrivateSeoPath(input.path)) {
      warnings.push("Path thuộc khu vực private — trang này thường nên noindex.");
    }
  }

  const canonicalError = validateSeoCanonicalUrl(input.canonicalUrl);
  if (canonicalError) {
    fieldErrors.canonicalUrl = canonicalError;
  }

  for (const [field, value] of [
    ["ogImageAssetId", input.ogImageAssetId],
    ["twitterImageAssetId", input.twitterImageAssetId]
  ] as const) {
    const err = validateMediaAssetId(value);
    if (err) {
      fieldErrors[field] = err;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Vui lòng sửa lỗi form.", fieldErrors };
  }

  return { ok: true, warnings };
}

export function validateSeoContentBlockForm(input: {
  title: string;
  contentMarkdown: string;
  routePath?: string | null;
  pageType?: string;
  status?: string;
  faqJson?: Array<{ question: string; answer: string }>;
  internalLinksJson?: Array<{ label: string; url: string; note?: string }>;
}): { ok: true; warnings: string[] } | { ok: false; message: string; fieldErrors?: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  const warnings: string[] = [];

  if (!input.title?.trim()) {
    fieldErrors.title = "title không được để trống.";
  }

  const status = input.status ?? "draft";
  if (status === "published" && !input.contentMarkdown?.trim()) {
    fieldErrors.contentMarkdown = "content_markdown không được để trống khi publish.";
  }

  if (input.routePath?.trim()) {
    const pathError = validateSeoInternalPath(input.routePath);
    if (pathError) {
      fieldErrors.routePath = pathError;
    } else if (isPrivateSeoPath(input.routePath)) {
      fieldErrors.routePath = "Không thể publish SEO block cho private route.";
    }
  }

  if (!input.pageType?.trim()) {
    fieldErrors.pageType = "page_type không được để trống.";
  }

  for (const item of input.faqJson ?? []) {
    if (!item.question.trim() || !item.answer.trim()) {
      warnings.push("FAQ có mục thiếu question hoặc answer — sẽ bỏ qua khi lưu.");
      break;
    }
  }

  for (const link of input.internalLinksJson ?? []) {
    const urlError = link.url.trim().startsWith("/")
      ? validateSeoInternalPath(link.url)
      : validateSeoCanonicalUrl(link.url);
    if (urlError) {
      fieldErrors.internalLinksJson = `Internal link không hợp lệ: ${urlError}`;
      break;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Vui lòng sửa lỗi form.", fieldErrors };
  }

  return { ok: true, warnings };
}
