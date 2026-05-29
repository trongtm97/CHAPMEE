import sharp from "sharp";
import { getCoverCropRect } from "@/lib/images/crop-with-focal-point";
import type { FocalPoint } from "@/lib/images/crop-with-focal-point";
import type { StoryImageVariant } from "@/types/story-images";
import { STORY_IMAGE_VARIANT_OUTPUTS } from "@/types/story-images";

export type GeneratedStoryImageVariant = {
  variant: Exclude<StoryImageVariant, "original">;
  buffer: Buffer;
  width: number;
  height: number;
  byteLength: number;
};

export type GenerateStoryImageVariantsResult = {
  variants: GeneratedStoryImageVariant[];
  totalProcessedBytes: number;
};

export class StoryImageVariantGenerationError extends Error {
  constructor(
    message: string,
    public readonly variant?: Exclude<StoryImageVariant, "original">
  ) {
    super(message);
    this.name = "StoryImageVariantGenerationError";
  }
}

async function renderVariant(
  source: Buffer,
  sourceWidth: number,
  sourceHeight: number,
  variant: Exclude<StoryImageVariant, "original">,
  focal: FocalPoint
): Promise<GeneratedStoryImageVariant> {
  const spec = STORY_IMAGE_VARIANT_OUTPUTS[variant];
  const crop = getCoverCropRect(
    sourceWidth,
    sourceHeight,
    spec.width,
    spec.height,
    focal
  );

  try {
    const { data, info } = await sharp(source)
      .extract(crop)
      .resize(spec.width, spec.height, {
        fit: "fill",
        withoutEnlargement: false
      })
      .webp({ quality: spec.quality })
      .toBuffer({ resolveWithObject: true });

    return {
      variant,
      buffer: data,
      width: info.width,
      height: info.height,
      byteLength: data.byteLength
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Không thể tạo biến thể ảnh.";

    throw new StoryImageVariantGenerationError(
      `Không thể tạo ảnh ${variant}: ${message}`,
      variant
    );
  }
}

/**
 * Build portrait, landscape, square, thumb, and blur WebP variants from normalized source.
 */
export async function generateStoryImageVariants(
  source: Buffer,
  sourceWidth: number,
  sourceHeight: number,
  focal: FocalPoint = { x: 0.5, y: 0.5 }
): Promise<GenerateStoryImageVariantsResult> {
  const variantNames = Object.keys(STORY_IMAGE_VARIANT_OUTPUTS) as Array<
    Exclude<StoryImageVariant, "original">
  >;

  const results = await Promise.all(
    variantNames.map((variant) =>
      renderVariant(source, sourceWidth, sourceHeight, variant, focal)
    )
  );

  const totalProcessedBytes = results.reduce((sum, item) => sum + item.byteLength, 0);

  return {
    variants: results,
    totalProcessedBytes
  };
}
