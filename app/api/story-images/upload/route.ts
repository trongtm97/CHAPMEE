import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  StoryImageUploadAccessError,
  assertStoryImageUploadAccess
} from "@/lib/images/assert-story-image-upload-access";
import { completeStoryImageUpload } from "@/lib/images/complete-story-image-upload";
import { StoryImageVariantGenerationError } from "@/lib/images/generate-story-image-variants";
import { parseFocalPointFromFormData } from "@/lib/images/parse-focal-point";
import {
  removeStoryImageStorageFolder
} from "@/lib/images/upload-story-image-variants";
import { mapStoryImageUploadError } from "@/lib/images/map-upload-error";
import {
  STORY_IMAGE_ERROR,
  STORY_IMAGE_MAX_BYTES,
  validateStoryImageFileMeta
} from "@/lib/images/validate-image-upload";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Sharp on Vercel requires Node runtime (not Edge). See: https://sharp.pixelplumbing.com/install#vercel */
export const maxDuration = 60;

// TODO: If uploads timeout on Vercel, move variant generation to a background job queue.

export async function POST(request: Request) {
  const imageId = randomUUID();
  let storyIdForCleanup: string | null = null;

  try {
    const formData = await request.formData();
    const storyId = String(formData.get("storyId") ?? "").trim();
    const fileValue = formData.get("file");
    const focal = parseFocalPointFromFormData(formData);

    if (!storyId) {
      return NextResponse.json({ error: "Thiếu mã truyện." }, { status: 400 });
    }

    storyIdForCleanup = storyId;

    if (!(fileValue instanceof File)) {
      return NextResponse.json({ error: STORY_IMAGE_ERROR.invalidFile }, { status: 400 });
    }

    const metaError = validateStoryImageFileMeta(fileValue);
    if (metaError) {
      return NextResponse.json({ error: metaError }, { status: 400 });
    }

    if (fileValue.size > STORY_IMAGE_MAX_BYTES) {
      return NextResponse.json({ error: STORY_IMAGE_ERROR.tooLarge }, { status: 400 });
    }

    await assertStoryImageUploadAccess(storyId);

    const inputBuffer = Buffer.from(await fileValue.arrayBuffer());
    const supabase = await createClient();

    const { image, coverUrl } = await completeStoryImageUpload({
      supabase,
      storyId,
      imageId,
      fileBuffer: inputBuffer,
      focal
    });

    revalidatePath(`/studio/stories/${storyId}/edit`);
    revalidatePath(`/studio/stories/${storyId}/edit`);

    return NextResponse.json({
      image,
      coverUrl
    });
  } catch (error) {
    if (storyIdForCleanup) {
      try {
        const supabase = await createClient();
        await removeStoryImageStorageFolder(supabase, storyIdForCleanup, imageId);
      } catch {
        // Best-effort cleanup
      }
    }

    if (error instanceof StoryImageUploadAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error instanceof StoryImageVariantGenerationError) {
      return NextResponse.json(
        {
          error:
            error.message ||
            "Không thể tạo đủ biến thể ảnh. Vui lòng thử lại với ảnh khác."
        },
        { status: 500 }
      );
    }

    const rawMessage =
      error instanceof Error ? error.message : "Không thể xử lý ảnh. Vui lòng thử lại.";

    const status =
      rawMessage === STORY_IMAGE_ERROR.unsupportedType ||
      rawMessage === STORY_IMAGE_ERROR.tooSmall ||
      rawMessage === STORY_IMAGE_ERROR.notAnImage
        ? 400
        : 500;

    return NextResponse.json(
      { error: mapStoryImageUploadError(rawMessage, status) },
      { status }
    );
  }
}
