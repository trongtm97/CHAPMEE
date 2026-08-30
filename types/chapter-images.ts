export const CHAPTER_IMAGE_STORAGE_BUCKET = "chapter-images";

export const CHAPTER_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const CHAPTER_IMAGE_MAX_PER_CHAPTER = 10;
export const CHAPTER_IMAGE_MAX_WIDTH = 1400;
export const CHAPTER_IMAGE_THUMB_MAX_WIDTH = 480;
export const CHAPTER_IMAGE_WEBP_QUALITY = 80;
export const CHAPTER_IMAGE_THUMB_WEBP_QUALITY = 75;
export const CHAPTER_IMAGE_MIN_WIDTH = 300;
export const CHAPTER_IMAGE_MIN_HEIGHT = 300;

export const CHAPTER_IMAGE_ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp"
] as const;

export type ChapterImageAcceptedMimeType =
  (typeof CHAPTER_IMAGE_ACCEPTED_MIME_TYPES)[number];

export const CHAPTER_IMAGE_ACCEPT_ATTRIBUTE =
  CHAPTER_IMAGE_ACCEPTED_MIME_TYPES.join(",");

export type ChapterImageAlign = "left" | "center" | "right";

export type ChapterImageBlock = {
  alt: string;
  /** Horizontal alignment within the reader column. Defaults to "center". */
  align?: ChapterImageAlign;
  caption: string;
  height: number;
  id: string;
  /** Same as id — chapter_images row used as internal media reference for Composer. */
  mediaAssetId?: string;
  /** Object key in S3 (resolved at render time). Legacy rows may store full URLs. */
  src: string;
  thumbSrc: string;
  width: number;
};

export type ChapterImageUploadResult = {
  block: ChapterImageBlock;
  image: {
    altText: string | null;
    caption: string | null;
    fileSizeBytes: number;
    height: number;
    id: string;
    imageUrl: string;
    thumbUrl: string | null;
    width: number;
  };
};
