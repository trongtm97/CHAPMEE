import { NextResponse } from "next/server";
import { ChapterImageUploadAccessError } from "@/lib/images/assert-chapter-image-upload-access";
import { uploadChapterImage } from "@/lib/images/upload-chapter-image";
import { mapStoryImageUploadError } from "@/lib/images/map-upload-error";
import {
  CHAPTER_IMAGE_ERROR,
  validateChapterImageFileMeta
} from "@/lib/images/validate-chapter-image-upload";
import { CHAPTER_IMAGE_MAX_BYTES } from "@/types/chapter-images";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// TODO: Image moderation pipeline (auto-scan + report workflow).

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const storyId = String(formData.get("storyId") ?? "").trim();
    const episodeId = String(formData.get("episodeId") ?? "").trim() || null;
    const draftId = String(formData.get("draftId") ?? "").trim() || null;
    const altText = String(formData.get("altText") ?? "");
    const caption = String(formData.get("caption") ?? "");
    const content = String(formData.get("content") ?? "");
    const fileValue = formData.get("file");

    if (!storyId) {
      return NextResponse.json({ error: "Thiếu mã truyện." }, { status: 400 });
    }

    if (!episodeId && !draftId) {
      return NextResponse.json(
        { error: CHAPTER_IMAGE_ERROR.missingScope },
        { status: 400 }
      );
    }

    if (!(fileValue instanceof File)) {
      return NextResponse.json(
        { error: CHAPTER_IMAGE_ERROR.invalidFile },
        { status: 400 }
      );
    }

    const metaError = validateChapterImageFileMeta(fileValue);

    if (metaError) {
      return NextResponse.json({ error: metaError }, { status: 400 });
    }

    if (fileValue.size > CHAPTER_IMAGE_MAX_BYTES) {
      return NextResponse.json(
        { error: CHAPTER_IMAGE_ERROR.tooLarge },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const inputBuffer = Buffer.from(await fileValue.arrayBuffer());

    const result = await uploadChapterImage({
      altText,
      caption,
      content,
      draftId,
      episodeId,
      fileBuffer: inputBuffer,
      storyId,
      supabase
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ChapterImageUploadAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    const rawMessage =
      error instanceof Error ? error.message : "Không thể xử lý ảnh. Vui lòng thử lại.";

    const status =
      rawMessage === CHAPTER_IMAGE_ERROR.unsupportedType ||
      rawMessage === CHAPTER_IMAGE_ERROR.tooSmall ||
      rawMessage === CHAPTER_IMAGE_ERROR.notAnImage ||
      rawMessage === CHAPTER_IMAGE_ERROR.limitReached ||
      rawMessage === CHAPTER_IMAGE_ERROR.missingScope
        ? 400
        : 500;

    return NextResponse.json(
      { error: mapStoryImageUploadError(rawMessage, status) },
      { status }
    );
  }
}
