import { getStoryImageStorageObjectPath } from "@/lib/images/get-current-story-image";
import type { GeneratedStoryImageVariant } from "@/lib/images/generate-story-image-variants";
import {
  registerStorageAsset,
  registerStorageDerivative
} from "@/lib/storage/asset-service";
import { getMediaS3Bucket } from "@/lib/storage/s3";
import type { StoryImageVariant } from "@/types/story-images";
import type { DatabaseClient } from "@/lib/db/types";

export type UploadedStoryImageVariant = {
  variant: StoryImageVariant;
  path: string;
  assetId: string | null;
};

export type UploadStoryImageSetResult = {
  original: UploadedStoryImageVariant;
  variants: UploadedStoryImageVariant[];
  /** storage_assets id for portrait variant — use for stories.cover_media_asset_id. */
  coverMediaAssetId: string | null;
  urls: {
    original: string;
    portrait: string;
    landscape: string;
    square: string;
    thumb: string;
    blur: string;
  };
};

async function uploadVariantBuffer(
  db: DatabaseClient,
  storyId: string,
  imageId: string,
  variant: StoryImageVariant,
  buffer: Buffer
): Promise<UploadedStoryImageVariant> {
  const path = getStoryImageStorageObjectPath(storyId, imageId, variant);

  const bucket = getMediaS3Bucket();
  const { error } = await db.storage.from(bucket).upload(path, buffer, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: true
  });

  if (error) {
    throw new Error(`Không thể tải ${variant}.webp lên storage: ${error.message}`);
  }

  const { assetId } = await registerStorageAsset(db, {
    bucket,
    isOriginal: variant === "original",
    isPublic: true,
    linkedEntityId: storyId,
    linkedEntityType: "story",
    linkedField: variant === "original" ? "story_image_original" : `story_image_${variant}`,
    metadata: { imageId, module: "story_cover", variant },
    mimeType: "image/webp",
    path,
    sizeBytes: buffer.byteLength,
    extension: "webp",
    usageType: "story_cover",
    status: "active"
  });

  return {
    variant,
    path,
    assetId
  };
}

export async function uploadStoryImageSet(
  db: DatabaseClient,
  storyId: string,
  imageId: string,
  originalBuffer: Buffer,
  generatedVariants: GeneratedStoryImageVariant[]
): Promise<UploadStoryImageSetResult> {
  const original = await uploadVariantBuffer(
    db,
    storyId,
    imageId,
    "original",
    originalBuffer
  );

  let uploadedVariants: UploadedStoryImageVariant[] = [];

  try {
    uploadedVariants = await Promise.all(
      generatedVariants.map((item) =>
        uploadVariantBuffer(db, storyId, imageId, item.variant, item.buffer)
      )
    );
  } catch (error) {
    const paths = [original.path, ...uploadedVariants.map((item) => item.path)];
    await db.storage.from(getMediaS3Bucket()).remove(paths);
    throw error;
  }

  const portraitAsset =
    uploadedVariants.find((item) => item.variant === "portrait") ??
    uploadedVariants[0] ??
    original;

  const { assetId } = await registerStorageAsset(db, {
    bucket: getMediaS3Bucket(),
    isOriginal: true,
    isPublic: true,
    linkedEntityId: storyId,
    linkedEntityType: "story",
    linkedField: "story_image_original",
    metadata: { imageId, module: "story_cover", variant: "original" },
    mimeType: "image/webp",
    path: original.path,
    sizeBytes: originalBuffer.byteLength,
    extension: "webp",
    usageType: "story_cover",
    variants: Object.fromEntries(uploadedVariants.map((item) => [item.variant, item.path]))
  });
  if (assetId) {
    await Promise.all(
      uploadedVariants.map((item) =>
        registerStorageDerivative(db, {
          assetId,
          bucket: getMediaS3Bucket(),
          metadata: { imageId, module: "story_cover" },
          mimeType: "image/webp",
          path: item.path,
          sizeBytes:
            generatedVariants.find((variant) => variant.variant === item.variant)?.buffer
              .byteLength ?? 0,
          variant: item.variant
        })
      )
    );
  }

  return {
    original,
    variants: uploadedVariants,
    coverMediaAssetId: portraitAsset.assetId ?? assetId,
    urls: {
      original: original.path,
      portrait: uploadedVariants.find((v) => v.variant === "portrait")?.path ?? original.path,
      landscape: uploadedVariants.find((v) => v.variant === "landscape")?.path ?? original.path,
      square: uploadedVariants.find((v) => v.variant === "square")?.path ?? original.path,
      thumb: uploadedVariants.find((v) => v.variant === "thumb")?.path ?? original.path,
      blur: uploadedVariants.find((v) => v.variant === "blur")?.path ?? original.path
    }
  };
}

export type StoryImageVariantUrls = {
  portrait: string;
  landscape: string;
  square: string;
  thumb: string;
  blur: string;
};

export async function uploadStoryImageVariantsOnly(
  db: DatabaseClient,
  storyId: string,
  imageId: string,
  generatedVariants: GeneratedStoryImageVariant[]
): Promise<StoryImageVariantUrls> {
  const uploadedVariants = await Promise.all(
    generatedVariants.map((item) =>
      uploadVariantBuffer(db, storyId, imageId, item.variant, item.buffer)
    )
  );

  return {
    portrait: uploadedVariants.find((v) => v.variant === "portrait")?.path ?? "",
    landscape: uploadedVariants.find((v) => v.variant === "landscape")?.path ?? "",
    square: uploadedVariants.find((v) => v.variant === "square")?.path ?? "",
    thumb: uploadedVariants.find((v) => v.variant === "thumb")?.path ?? "",
    blur: uploadedVariants.find((v) => v.variant === "blur")?.path ?? ""
  };
}

export async function removeStoryImageStorageFolder(
  db: DatabaseClient,
  storyId: string,
  imageId: string
) {
  const variants: StoryImageVariant[] = [
    "original",
    "portrait",
    "landscape",
    "square",
    "thumb",
    "blur"
  ];

  const paths = variants.map((variant) =>
    getStoryImageStorageObjectPath(storyId, imageId, variant)
  );

  await db.storage.from(getMediaS3Bucket()).remove(paths);
}
