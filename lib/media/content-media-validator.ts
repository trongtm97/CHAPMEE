import { assertNoForbiddenLocalMediaUrls, containsForbiddenLocalMediaUrl } from "@/lib/media/media-url";

export const LOCAL_MEDIA_URL_ERROR =
  "Không được lưu URL local vào nội dung. Hãy upload ảnh qua hệ thống media của ChapMee.";

export function scanContentForForbiddenLocalUrls(value: string): string[] {
  const issues: string[] = [];
  if (!value.trim()) {
    return issues;
  }

  if (containsForbiddenLocalMediaUrl(value)) {
    issues.push(LOCAL_MEDIA_URL_ERROR);
  }

  return issues;
}

export function validatePlainChapterContent(content: string): { ok: true } | { ok: false; error: string } {
  const issues = scanContentForForbiddenLocalUrls(content);
  if (issues.length > 0) {
    return { ok: false, error: issues[0] };
  }
  return { ok: true };
}

export function validateStructuredContentJson(json: string): { ok: true } | { ok: false; error: string } {
  const issues = scanContentForForbiddenLocalUrls(json);
  if (issues.length > 0) {
    return { ok: false, error: issues[0] };
  }
  return { ok: true };
}

export function assertChapterContentSafeForPersist(content: string) {
  assertNoForbiddenLocalMediaUrls(content, "nội dung chương");
}

export function assertStructuredContentSafeForPersist(structured: unknown) {
  if (structured === null || structured === undefined) {
    return;
  }
  assertNoForbiddenLocalMediaUrls(JSON.stringify(structured), "nội dung Composer");
}
