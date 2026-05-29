import {
  CHAPTER_IMAGE_ACCEPTED_MIME_TYPES,
  CHAPTER_IMAGE_MAX_BYTES,
  CHAPTER_IMAGE_MIN_HEIGHT,
  CHAPTER_IMAGE_MIN_WIDTH,
  type ChapterImageAcceptedMimeType
} from "@/types/chapter-images";

export const CHAPTER_IMAGE_ERROR = {
  unsupportedType: "Định dạng ảnh không được hỗ trợ.",
  tooLarge: "Ảnh quá nặng. Vui lòng chọn ảnh dưới 5MB.",
  tooSmall: "Ảnh quá nhỏ, vui lòng chọn ảnh rõ hơn (tối thiểu 300×300).",
  invalidFile: "File không hợp lệ.",
  notAnImage: "File không phải ảnh hợp lệ.",
  limitReached: "Bạn đã đạt giới hạn ảnh trong chương này.",
  missingScope: "Lưu nháp chương trước khi chèn ảnh."
} as const;

export function validateChapterImageFileMeta(
  file: Pick<File, "type" | "size">
): string | null {
  if (
    !CHAPTER_IMAGE_ACCEPTED_MIME_TYPES.includes(
      file.type as ChapterImageAcceptedMimeType
    )
  ) {
    return CHAPTER_IMAGE_ERROR.unsupportedType;
  }

  if (file.size > CHAPTER_IMAGE_MAX_BYTES) {
    return CHAPTER_IMAGE_ERROR.tooLarge;
  }

  if (file.size === 0) {
    return CHAPTER_IMAGE_ERROR.invalidFile;
  }

  return null;
}

export function validateChapterImageDimensions(
  width: number,
  height: number
): string | null {
  if (width < CHAPTER_IMAGE_MIN_WIDTH || height < CHAPTER_IMAGE_MIN_HEIGHT) {
    return CHAPTER_IMAGE_ERROR.tooSmall;
  }

  return null;
}
