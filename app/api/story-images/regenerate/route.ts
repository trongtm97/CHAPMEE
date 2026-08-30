import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  StoryImageUploadAccessError,
  assertStoryImageUploadAccess
} from "@/lib/images/assert-story-image-upload-access";
import { StoryImageVariantGenerationError } from "@/lib/images/generate-story-image-variants";
import { parseFocalPointFromFormData } from "@/lib/images/parse-focal-point";
import { regenerateStoryImageVariants } from "@/lib/images/update-story-image-focal-point";
import { createClient } from "@/lib/data/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const storyId = String(formData.get("storyId") ?? "").trim();
    const imageId = String(formData.get("imageId") ?? "").trim() || undefined;
    const focal = parseFocalPointFromFormData(formData);

    if (!storyId) {
      return NextResponse.json({ error: "Thiếu mã truyện." }, { status: 400 });
    }

    await assertStoryImageUploadAccess(storyId);

    const db = await createClient();
    const { image, coverUrl } = await regenerateStoryImageVariants({
      db,
      storyId,
      imageId,
      focal
    });

    revalidatePath(`/studio/stories/${storyId}/edit`);
    revalidatePath(`/studio/stories/${storyId}/edit`);

    return NextResponse.json({
      image,
      coverUrl
    });
  } catch (error) {
    if (error instanceof StoryImageUploadAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error instanceof StoryImageVariantGenerationError) {
      return NextResponse.json(
        {
          error:
            error.message ||
            "Không thể tạo lại biến thể ảnh. Vui lòng thử lại."
        },
        { status: 500 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Không thể cập nhật ảnh bìa.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
