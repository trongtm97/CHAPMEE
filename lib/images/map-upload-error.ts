import { STORY_IMAGE_ERROR } from "@/lib/images/validate-image-upload";

/**
 * Chuẩn hóa thông báo lỗi upload ảnh bìa (API / mạng / xử lý).
 */
export function mapStoryImageUploadError(
  message: string | undefined,
  status?: number
): string {
  if (status === 403) {
    return message?.trim() || "Bạn không có quyền tải ảnh cho truyện này.";
  }

  if (status === 401) {
    return "Bạn cần đăng nhập để tải ảnh bìa.";
  }

  if (status === 408 || status === 504) {
    return "Xử lý ảnh quá lâu. Vui lòng thử ảnh nhỏ hơn hoặc thử lại sau.";
  }

  if (status === 413) {
    return STORY_IMAGE_ERROR.tooLarge;
  }

  const normalized = message?.trim() ?? "";

  if (!normalized) {
    return "Không thể tải ảnh lên. Kiểm tra kết nối mạng và thử lại.";
  }

  if (
    normalized === STORY_IMAGE_ERROR.unsupportedType ||
    normalized === STORY_IMAGE_ERROR.tooLarge ||
    normalized === STORY_IMAGE_ERROR.tooSmall ||
    normalized === STORY_IMAGE_ERROR.invalidFile ||
    normalized === STORY_IMAGE_ERROR.notAnImage
  ) {
    return normalized;
  }

  if (/quyền|đăng nhập/i.test(normalized)) {
    return normalized;
  }

  if (/storage|tải .* lên/i.test(normalized)) {
    return "Không thể lưu ảnh lên máy chủ. Vui lòng thử lại sau vài phút.";
  }

  if (/metadata|lưu.*ảnh/i.test(normalized)) {
    return "Ảnh đã xử lý nhưng không lưu được. Ảnh cũ vẫn giữ nguyên — vui lòng thử lại.";
  }

  if (/biến thể|variant|xử lý ảnh/i.test(normalized)) {
    return "Không thể xử lý ảnh. Vui lòng thử ảnh khác hoặc giảm kích thước.";
  }

  if (/network|fetch|failed to fetch|ECONNREFUSED/i.test(normalized)) {
    return "Mất kết nối khi tải ảnh. Kiểm tra mạng và thử lại.";
  }

  return normalized;
}
