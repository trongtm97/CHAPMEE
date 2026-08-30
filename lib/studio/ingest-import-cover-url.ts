import { randomUUID } from "node:crypto";

import { completeStoryImageUpload } from "@/lib/images/complete-story-image-upload";
import { DEFAULT_FOCAL_POINT } from "@/lib/images/parse-focal-point";
import { STORY_IMAGE_ERROR, STORY_IMAGE_MAX_BYTES } from "@/lib/images/validate-image-upload";
import {
  containsForbiddenLocalMediaUrl,
  normalizeStoryCoverForStorage,
  shouldIngestExternalMediaUrl
} from "@/lib/media/media-url";
import type { DatabaseClient } from "@/lib/db/types";

const DOWNLOAD_TIMEOUT_MS = 30_000;

/** @deprecated Use shouldIngestExternalMediaUrl */
export function shouldIngestExternalCoverUrl(raw: string): boolean {
  return shouldIngestExternalMediaUrl(raw);
}

async function downloadRemoteImage(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "image/jpeg,image/png,image/webp,image/*;q=0.8,*/*;q=0.5",
        "User-Agent": "ChapMee-Import/1.0 (+https://chapmee.com)"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength) {
      const size = Number.parseInt(contentLength, 10);
      if (Number.isFinite(size) && size > STORY_IMAGE_MAX_BYTES) {
        throw new Error(STORY_IMAGE_ERROR.tooLarge);
      }
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength === 0) {
      throw new Error(STORY_IMAGE_ERROR.invalidFile);
    }
    if (bytes.byteLength > STORY_IMAGE_MAX_BYTES) {
      throw new Error(STORY_IMAGE_ERROR.tooLarge);
    }

    return bytes;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Tải ảnh quá thời gian chờ (30 giây).");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export type IngestImportCoverResult =
  | { ok: true; coverUrl: string }
  | { ok: false; warning: string };

/**
 * Download an external cover URL and persist via the standard story cover pipeline.
 */
export async function ingestImportStoryCoverFromUrl(
  db: DatabaseClient,
  storyId: string,
  rawUrl: string
): Promise<IngestImportCoverResult> {
  const url = rawUrl.trim();
  if (!url) {
    return { ok: false, warning: "cover_url trống." };
  }

  if (containsForbiddenLocalMediaUrl(url)) {
    return {
      ok: false,
      warning: "cover_url là đường dẫn local — bỏ qua, hãy dùng link https công khai."
    };
  }

  const normalized = normalizeStoryCoverForStorage(url);

  if (normalized.kind === "ingest") {
    try {
      const buffer = await downloadRemoteImage(normalized.url);
      const uploaded = await completeStoryImageUpload({
        db,
        storyId,
        imageId: randomUUID(),
        fileBuffer: buffer,
        focal: DEFAULT_FOCAL_POINT
      });

      return { ok: true, coverUrl: uploaded.coverUrl };
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "Không tải được ảnh bìa từ link ngoài.";
      return {
        ok: false,
        warning: `cover_url: ${detail} — bỏ qua, bổ sung bìa sau trong Studio.`
      };
    }
  }

  if (normalized.kind === "object_key") {
    const { error } = await db
      .from("stories")
      .update({ cover_url: normalized.objectKey })
      .eq("id", storyId);

    if (error) {
      return { ok: false, warning: `Không lưu được cover_url — ${error.message}` };
    }

    return { ok: true, coverUrl: normalized.objectKey };
  }

  if (normalized.kind === "rejected") {
    return { ok: false, warning: normalized.reason };
  }

  return { ok: false, warning: "cover_url trống." };
}
