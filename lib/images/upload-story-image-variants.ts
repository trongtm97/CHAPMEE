import { getStoryImageStorageObjectPath } from "@/lib/images/get-current-story-image";
import type { GeneratedStoryImageVariant } from "@/lib/images/generate-story-image-variants";
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
