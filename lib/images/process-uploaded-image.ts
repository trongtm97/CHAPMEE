import sharp from "sharp";
import {
  STORY_IMAGE_ERROR,
  validateStoryImageDimensions
} from "@/lib/images/validate-image-upload";

const NORMALIZED_MAX_EDGE = 2000;
const WEBP_QUALITY = 82;

export type ProcessedStoryImage = {
  buffer: Buffer;
  width: number;
  height: number;
  mimeType: "image/webp";
  originalFileSizeBytes: number;
  processedFileSizeBytes: number;
};

function isAllowedSharpFormat(format: string | undefined) {
  return format === "jpeg" || format === "png" || format === "webp";
}

/**
 * Normalize upload: verify image, auto-rotate EXIF, strip metadata, resize, WebP.
 * Does not upscale images smaller than max edge.
 */
export async function processUploadedStoryImage(
  input: Buffer
): Promise<ProcessedStoryImage> {
  const originalFileSizeBytes = input.byteLength;

  let pipeline = sharp(input, { failOn: "error" }).rotate();

  const metadata = await pipeline.metadata();
  const format = metadata.format;

  if (!isAllowedSharpFormat(format)) {
    throw new Error(STORY_IMAGE_ERROR.unsupportedType);
  }

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const dimensionError = validateStoryImageDimensions(width, height);

  if (dimensionError) {
    throw new Error(dimensionError);
  }

  const needsResize = width > NORMALIZED_MAX_EDGE || height > NORMALIZED_MAX_EDGE;

  if (needsResize) {
    pipeline = pipeline.resize({
      width: NORMALIZED_MAX_EDGE,
      height: NORMALIZED_MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true
    });
  }

  const { data, info } = await pipeline
    .webp({ quality: WEBP_QUALITY })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    width: info.width,
    height: info.height,
    mimeType: "image/webp",
    originalFileSizeBytes,
    processedFileSizeBytes: data.byteLength
  };
}
