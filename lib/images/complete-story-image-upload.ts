import { cleanupSupersededStoryImageStorage } from "@/lib/images/cleanup-story-images";
import type { FocalPoint } from "@/lib/images/crop-with-focal-point";
import { generateStoryImageVariants } from "@/lib/images/generate-story-image-variants";
import { logStoryImageVariantGap } from "@/lib/images/story-image-health";
import { processUploadedStoryImage } from "@/lib/images/process-uploaded-image";
import { uploadStoryImageSet } from "@/lib/images/upload-story-image-variants";
import { saveStoryImageRecord } from "@/lib/stories/update-story-image";
import type { StoryImage } from "@/types/story-images";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CompleteStoryImageUploadInput = {
  supabase: SupabaseClient;
  storyId: string;
  imageId: string;
  fileBuffer: Buffer;
  focal: FocalPoint;
};

export type CompleteStoryImageUploadResult = {
  image: StoryImage;
  coverUrl: string;
};

export async function completeStoryImageUpload(
  input: CompleteStoryImageUploadInput
): Promise<CompleteStoryImageUploadResult> {
  const processed = await processUploadedStoryImage(input.fileBuffer);

  const { variants, totalProcessedBytes } = await generateStoryImageVariants(
    processed.buffer,
    processed.width,
    processed.height,
    input.focal
  );

  const uploaded = await uploadStoryImageSet(
    input.supabase,
    input.storyId,
    input.imageId,
    processed.buffer,
    variants
  );

  const totalBytes = processed.processedFileSizeBytes + totalProcessedBytes;

  const { image, error } = await saveStoryImageRecord(input.supabase, {
    storyId: input.storyId,
    imageId: input.imageId,
    urls: uploaded.urls,
    width: processed.width,
    height: processed.height,
    originalFileSizeBytes: processed.originalFileSizeBytes,
    processedFileSizeBytes: totalBytes,
    focalX: input.focal.x,
    focalY: input.focal.y
  });

  if (error || !image) {
    throw new Error(error ?? "Không thể lưu metadata ảnh.");
  }

  logStoryImageVariantGap(input.storyId, image);

  await cleanupSupersededStoryImageStorage(
    input.supabase,
    input.storyId,
    input.imageId
  );

  return {
    image,
    coverUrl: uploaded.urls.portrait
  };
}
