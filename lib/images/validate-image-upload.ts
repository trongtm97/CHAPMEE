export const STORY_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const STORY_IMAGE_MIN_WIDTH = 600;
export const STORY_IMAGE_MIN_HEIGHT = 600;

export const STORY_IMAGE_ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp"
] as const;

export type StoryImageAcceptedMimeType = (typeof STORY_IMAGE_ACCEPTED_MIME_TYPES)[number];

export const STORY_IMAGE_ACCEPT_ATTRIBUTE = STORY_IMAGE_ACCEPTED_MIME_TYPES.join(",");

export const STORY_IMAGE_ERROR = {
  unsupportedType: "Định dạng ảnh không được hỗ trợ.",
  tooLarge: "Ảnh quá nặng. Vui lòng chọn ảnh dưới 8MB.",
  tooSmall: "Ảnh quá nhỏ, vui lòng chọn ảnh rõ hơn.",
  invalidFile: "File không hợp lệ.",
  notAnImage: "File không phải ảnh hợp lệ."
} as const;

export function validateStoryImageFileMeta(
  file: Pick<File, "type" | "size">
): string | null {
  if (!STORY_IMAGE_ACCEPTED_MIME_TYPES.includes(file.type as StoryImageAcceptedMimeType)) {
    return STORY_IMAGE_ERROR.unsupportedType;
  }

  if (file.size > STORY_IMAGE_MAX_BYTES) {
    return STORY_IMAGE_ERROR.tooLarge;
  }

  if (file.size === 0) {
    return STORY_IMAGE_ERROR.invalidFile;
  }

  return null;
}

export function validateStoryImageDimensions(width: number, height: number): string | null {
  if (width < STORY_IMAGE_MIN_WIDTH || height < STORY_IMAGE_MIN_HEIGHT) {
    return STORY_IMAGE_ERROR.tooSmall;
  }

  return null;
}
