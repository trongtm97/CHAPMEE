import { getStoryImageStorageObjectPath } from "@/lib/images/get-current-story-image";
import type { GeneratedStoryImageVariant } from "@/lib/images/generate-story-image-variants";
import {
  registerStorageAsset,
  registerStorageDerivative
} from "@/lib/storage/asset-service";
import { STORY_IMAGE_STORAGE_BUCKET, type StoryImageVariant } from "@/types/story-images";
import type { SupabaseClient } from "@supabase/supabase-js";

export type UploadedStoryImageVariant = {
  variant: StoryImageVariant;
  path: string;
  publicUrl: string;
};

export type UploadStoryImageSetResult = {
  original: UploadedStoryImageVariant;
  variants: UploadedStoryImageVariant[];
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
  supabase: SupabaseClient,
  storyId: string,
  imageId: string,
  variant: StoryImageVariant,
  buffer: Buffer
): Promise<UploadedStoryImageVariant> {
  const path = getStoryImageStorageObjectPath(storyId, imageId, variant);

  const { error } = await supabase.storage.from(STORY_IMAGE_STORAGE_BUCKET).upload(path, buffer, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: true
  });

  if (error) {
    throw new Error(`Không thể tải ${variant}.webp lên storage: ${error.message}`);
  }

  const { data } = supabase.storage.from(STORY_IMAGE_STORAGE_BUCKET).getPublicUrl(path);
  await registerStorageAsset(supabase, {
    bucket: STORY_IMAGE_STORAGE_BUCKET,
    isOriginal: variant === "original",
    isPublic: true,
    linkedEntityId: storyId,
    linkedEntityType: "story",
    linkedField: variant === "original" ? "story_image_original" : `story_image_${variant}`,
    metadata: { imageId, module: "story_cover", variant },
    mimeType: "image/webp",
    path,
    publicUrl: data.publicUrl,
    sizeBytes: buffer.byteLength,
    extension: "webp",
    usageType: "story_cover"
  });

  return {
    variant,
    path,
    publicUrl: data.publicUrl
  };
}

export async function uploadStoryImageSet(
  supabase: SupabaseClient,
  storyId: string,
  imageId: string,
  originalBuffer: Buffer,
  generatedVariants: GeneratedStoryImageVariant[]
): Promise<UploadStoryImageSetResult> {
  const original = await uploadVariantBuffer(
    supabase,
    storyId,
    imageId,
    "original",
    originalBuffer
  );

  let uploadedVariants: UploadedStoryImageVariant[] = [];

  try {
    uploadedVariants = await Promise.all(
      generatedVariants.map((item) =>
        uploadVariantBuffer(supabase, storyId, imageId, item.variant, item.buffer)
      )
    );
  } catch (error) {
    const paths = [original.path, ...uploadedVariants.map((item) => item.path)];
    await supabase.storage.from(STORY_IMAGE_STORAGE_BUCKET).remove(paths);
    throw error;
  }

  const urlByVariant = Object.fromEntries(
    uploadedVariants.map((item) => [item.variant, item.publicUrl])
  ) as Record<Exclude<StoryImageVariant, "original">, string>;
  const { assetId } = await registerStorageAsset(supabase, {
    bucket: STORY_IMAGE_STORAGE_BUCKET,
    isOriginal: true,
    isPublic: true,
    linkedEntityId: storyId,
    linkedEntityType: "story",
    linkedField: "story_image_original",
    metadata: { imageId, module: "story_cover", variant: "original" },
    mimeType: "image/webp",
    path: original.path,
    publicUrl: original.publicUrl,
    sizeBytes: originalBuffer.byteLength,
    extension: "webp",
    usageType: "story_cover",
    variants: Object.fromEntries(uploadedVariants.map((item) => [item.variant, item.publicUrl]))
  });
  if (assetId) {
    await Promise.all(
      uploadedVariants.map((item) =>
        registerStorageDerivative(supabase, {
          assetId,
          bucket: STORY_IMAGE_STORAGE_BUCKET,
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
    urls: {
      original: original.publicUrl,
      portrait: urlByVariant.portrait,
      landscape: urlByVariant.landscape,
      square: urlByVariant.square,
      thumb: urlByVariant.thumb,
      blur: urlByVariant.blur
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
  supabase: SupabaseClient,
  storyId: string,
  imageId: string,
  generatedVariants: GeneratedStoryImageVariant[]
): Promise<StoryImageVariantUrls> {
  const uploadedVariants = await Promise.all(
    generatedVariants.map((item) =>
      uploadVariantBuffer(supabase, storyId, imageId, item.variant, item.buffer)
    )
  );

  const urlByVariant = Object.fromEntries(
    uploadedVariants.map((item) => [item.variant, item.publicUrl])
  ) as Record<Exclude<StoryImageVariant, "original">, string>;

  return {
    portrait: urlByVariant.portrait,
    landscape: urlByVariant.landscape,
    square: urlByVariant.square,
    thumb: urlByVariant.thumb,
    blur: urlByVariant.blur
  };
}

export async function removeStoryImageStorageFolder(
  supabase: SupabaseClient,
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

  await supabase.storage.from(STORY_IMAGE_STORAGE_BUCKET).remove(paths);
}
