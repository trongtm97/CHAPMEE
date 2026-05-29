import sharp from "sharp";
import {
  CHAPTER_IMAGE_MAX_WIDTH,
  CHAPTER_IMAGE_THUMB_MAX_WIDTH,
  CHAPTER_IMAGE_THUMB_WEBP_QUALITY,
  CHAPTER_IMAGE_WEBP_QUALITY
} from "@/types/chapter-images";
import {
  CHAPTER_IMAGE_ERROR,
  validateChapterImageDimensions
} from "@/lib/images/validate-chapter-image-upload";

export type ProcessedChapterImageVariant = {
  buffer: Buffer;
  fileSizeBytes: number;
  height: number;
  width: number;
};

export type ProcessedChapterImage = {
  image: ProcessedChapterImageVariant;
  originalFileSizeBytes: number;
  thumb: ProcessedChapterImageVariant;
};

function isAllowedSharpFormat(format: string | undefined) {
  return format === "jpeg" || format === "png" || format === "webp";
}

async function toWebpVariant(
  pipeline: sharp.Sharp,
  maxWidth: number,
  quality: number
): Promise<ProcessedChapterImageVariant> {
  const { data, info } = await pipeline
    .clone()
    .resize({
      width: maxWidth,
      fit: "inside",
      withoutEnlargement: true
    })
    .webp({ quality })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    fileSizeBytes: data.byteLength,
    height: info.height,
    width: info.width
  };
}

/** Normalize chapter image: EXIF rotate, strip metadata, resize, WebP + thumb. */
export async function processChapterImage(
  input: Buffer
): Promise<ProcessedChapterImage> {
  const originalFileSizeBytes = input.byteLength;
  const base = sharp(input, { failOn: "error" }).rotate();
  const metadata = await base.metadata();

  if (metadata.format === "gif") {
    throw new Error(CHAPTER_IMAGE_ERROR.unsupportedType);
  }

  if (!isAllowedSharpFormat(metadata.format)) {
    throw new Error(CHAPTER_IMAGE_ERROR.unsupportedType);
  }

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const dimensionError = validateChapterImageDimensions(width, height);

  if (dimensionError) {
    throw new Error(dimensionError);
  }

  const image = await toWebpVariant(base, CHAPTER_IMAGE_MAX_WIDTH, CHAPTER_IMAGE_WEBP_QUALITY);
  const thumb = await toWebpVariant(
    base,
    CHAPTER_IMAGE_THUMB_MAX_WIDTH,
    CHAPTER_IMAGE_THUMB_WEBP_QUALITY
  );

  return {
    image,
    originalFileSizeBytes,
    thumb
  };
}
