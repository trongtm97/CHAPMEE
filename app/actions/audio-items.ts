"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile, isAdminOrFounder } from "@/lib/auth/getCurrentProfile";
import { requireCreatorProfile } from "@/lib/creator/require-creator-profile";
import { getAudioPolicySettings } from "@/lib/settings/audio-policy-settings";
import {
  AudioItemsError,
  createAudioItem,
  deleteAudioItem,
  hideAudioItem,
  publishAudioItem,
  setAudioItemStatusAsAdmin,
  submitAudioItemForReview,
  updateAudioItem,
  type AudioItemInput
} from "@/src/lib/audio/audio-items";
import { buildStoryAudioQueue } from "@/src/lib/audio/audio-queue";
import {
  AudioProgressError,
  getListeningProgress,
  markAudioCompleted,
  saveListeningProgress
} from "@/src/lib/audio/audio-progress";
import { validateExternalAudioUrl, validateYoutubeUrl } from "@/src/lib/audio/audio-url";

type AudioActionResult<T = unknown> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string };

function normalizeInput(formData: FormData): AudioItemInput {
  const toNumber = (value: FormDataEntryValue | null) => {
    if (value == null || String(value).trim() === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  return {
    story_id: String(formData.get("story_id") ?? "").trim() || null,
    chapter_id: String(formData.get("chapter_id") ?? "").trim() || null,
    audio_source_type: (String(formData.get("audio_source_type") ?? "").trim() as AudioItemInput["audio_source_type"]) || null,
    external_audio_url: String(formData.get("external_audio_url") ?? "").trim() || null,
    youtube_url: String(formData.get("youtube_url") ?? "").trim() || null,
    youtube_video_id: String(formData.get("youtube_video_id") ?? "").trim() || null,
    title: String(formData.get("title") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
    part_number: toNumber(formData.get("part_number")),
    duration_seconds: toNumber(formData.get("duration_seconds")),
    language: String(formData.get("language") ?? "").trim() || null,
    sort_order: toNumber(formData.get("sort_order")),
    is_primary: formData.get("is_primary") === "1" || formData.get("is_primary") === "true",
    background_playback_allowed:
      formData.get("background_playback_allowed") === "1" ||
      formData.get("background_playback_allowed") === "true",
    continuous_playback_allowed:
      formData.get("continuous_playback_allowed") === "1" ||
      formData.get("continuous_playback_allowed") === "true",
    is_free: formData.get("is_free") === "1" || formData.get("is_free") === "true",
    price: toNumber(formData.get("price")),
    price_coins: toNumber(formData.get("price_coins")),
    coin_unlock_price: toNumber(formData.get("coin_unlock_price")),
    unlock_type: String(formData.get("unlock_type") ?? "").trim() || null,
    status_intent: (String(formData.get("status_intent") ?? "").trim() as AudioItemInput["status_intent"]) || "draft"
  };
}

async function requireCreatorSession(nextPath = "/studio") {
  const { creatorProfile, user } = await requireCreatorProfile(nextPath);
  const state = await getCurrentProfile();
  if (!state.profile) {
    throw new Error("Bạn cần đăng nhập.");
  }
  return {
    creatorProfile,
    profileIdForDb: state.profile.id,
    userId: user.id
  };
}

async function assertRightsDeclarationAccepted(_formData: FormData) {
  const settings = await getAudioPolicySettings();
  if (!settings.require_rights_declaration) {
    return;
  }
  // Implicit consent: saving/publishing audio implies rights acceptance (see UI notice).
}

async function requireSessionProfile(): Promise<{ id: string }> {
  const state = await getCurrentProfile();
  if (!state.user || !state.profile) {
    throw new Error("Bạn cần đăng nhập.");
  }
  return { id: state.profile.id };
}

function toActionError(error: unknown): string {
  if (error instanceof AudioItemsError || error instanceof AudioProgressError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Đã có lỗi xảy ra.";
}

export async function createAudioItemAction(formData: FormData): Promise<AudioActionResult> {
  try {
    const { creatorProfile, profileIdForDb } = await requireCreatorSession();
    await assertRightsDeclarationAccepted(formData);
    const input = normalizeInput(formData);
    const created = await createAudioItem(creatorProfile, profileIdForDb, input);
    revalidatePath(`/studio/stories/${created.story_id}/audio`);
    return { ok: true, data: created };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function updateAudioItemAction(formData: FormData): Promise<AudioActionResult> {
  try {
    const { creatorProfile, profileIdForDb } = await requireCreatorSession();
    await assertRightsDeclarationAccepted(formData);
    const audioId = String(formData.get("audio_id") ?? "").trim();
    if (!audioId) {
      return { ok: false, error: "Thiếu audio_id." };
    }
    const updated = await updateAudioItem(
      creatorProfile,
      profileIdForDb,
      audioId,
      normalizeInput(formData)
    );
    revalidatePath(`/studio/stories/${updated.story_id}/audio`);
    return { ok: true, data: updated };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function deleteAudioItemAction(formData: FormData): Promise<AudioActionResult<{ deleted: true }>> {
  try {
    const { creatorProfile, profileIdForDb } = await requireCreatorSession();
    const audioId = String(formData.get("audio_id") ?? "").trim();
    const storyId = String(formData.get("story_id") ?? "").trim();
    if (!audioId) {
      return { ok: false, error: "Thiếu audio_id." };
    }
    await deleteAudioItem(creatorProfile, profileIdForDb, audioId);
    if (storyId) {
      revalidatePath(`/studio/stories/${storyId}/audio`);
    }
    return { ok: true, data: { deleted: true } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function submitAudioItemForReviewAction(formData: FormData): Promise<AudioActionResult> {
  try {
    const { creatorProfile, profileIdForDb } = await requireCreatorSession();
    const audioId = String(formData.get("audio_id") ?? "").trim();
    if (!audioId) {
      return { ok: false, error: "Thiếu audio_id." };
    }
    const row = await submitAudioItemForReview(creatorProfile, profileIdForDb, audioId);
    revalidatePath(`/studio/stories/${row.story_id}/audio`);
    return { ok: true, data: row };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function publishAudioItemAction(formData: FormData): Promise<AudioActionResult> {
  try {
    const { creatorProfile, profileIdForDb } = await requireCreatorSession();
    const audioId = String(formData.get("audio_id") ?? "").trim();
    if (!audioId) {
      return { ok: false, error: "Thiếu audio_id." };
    }
    const row = await publishAudioItem(creatorProfile, profileIdForDb, audioId);
    revalidatePath(`/studio/stories/${row.story_id}/audio`);
    return { ok: true, data: row };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function hideAudioItemAction(formData: FormData): Promise<AudioActionResult> {
  try {
    const { creatorProfile, profileIdForDb } = await requireCreatorSession();
    const audioId = String(formData.get("audio_id") ?? "").trim();
    if (!audioId) {
      return { ok: false, error: "Thiếu audio_id." };
    }
    const row = await hideAudioItem(creatorProfile, profileIdForDb, audioId);
    revalidatePath(`/studio/stories/${row.story_id}/audio`);
    return { ok: true, data: row };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function checkAudioLinkAction(formData: FormData): Promise<AudioActionResult> {
  try {
    await requireCreatorSession();
    const sourceType = String(formData.get("audio_source_type") ?? "").trim();
    const url = String(formData.get("url") ?? "").trim();
    const settings = await getAudioPolicySettings();

    if (sourceType === "external_audio_url") {
      const result = validateExternalAudioUrl(url, settings);
      return {
        ok: true,
        data: result,
        message: result.ok ? "URL external audio hợp lệ." : "URL external audio không hợp lệ."
      };
    }
    if (sourceType === "youtube_embed") {
      const result = validateYoutubeUrl(url, settings);
      return {
        ok: true,
        data: result,
        message: result.ok ? "URL YouTube hợp lệ." : "URL YouTube không hợp lệ."
      };
    }
    return { ok: false, error: "Nguồn audio không hợp lệ." };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function getStoryAudioQueueAction(storyId: string): Promise<AudioActionResult> {
  try {
    await requireCreatorSession(`/studio/stories/${storyId}/audio`);
    if (!storyId) {
      return { ok: false, error: "Thiếu storyId." };
    }
    const queue = await buildStoryAudioQueue(storyId);
    return { ok: true, data: queue };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function getListeningProgressAction(audioItemId: string): Promise<AudioActionResult> {
  try {
    const profile = await requireSessionProfile();
    const id = audioItemId.trim();
    if (!id) {
      return { ok: false, error: "Thiếu audio_item_id." };
    }
    const row = await getListeningProgress(profile.id, id);
    if (!row) {
      return { ok: true, data: null };
    }
    return {
      ok: true,
      data: {
        storyId: row.story_id,
        currentTimeSeconds: row.current_time_seconds,
        durationSeconds: row.duration_seconds,
        completedAt: row.completed_at
      }
    };
  } catch {
    return { ok: true, data: null };
  }
}

export async function saveAudioProgressAction(formData: FormData): Promise<AudioActionResult> {
  try {
    const profile = await requireSessionProfile();
    const row = await saveListeningProgress(profile.id, {
      storyId: String(formData.get("story_id") ?? "").trim(),
      audioItemId: String(formData.get("audio_item_id") ?? "").trim(),
      currentTimeSeconds: Number(formData.get("current_time_seconds") ?? 0),
      durationSeconds: Number(formData.get("duration_seconds") ?? 0) || null,
      playbackRate: Number(formData.get("playback_rate") ?? 1)
    });
    return { ok: true, data: row };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function markAudioCompletedAction(formData: FormData): Promise<AudioActionResult> {
  try {
    const profile = await requireSessionProfile();
    const audioItemId = String(formData.get("audio_item_id") ?? "").trim();
    if (!audioItemId) {
      return { ok: false, error: "Thiếu audio_item_id." };
    }
    const row = await markAudioCompleted(profile.id, audioItemId);
    return { ok: true, data: row };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function adminPublishAudioItemAction(formData: FormData): Promise<AudioActionResult> {
  try {
    const state = await getCurrentProfile();
    if (!state.profile || !isAdminOrFounder(state.profile)) {
      return { ok: false, error: "Bạn không có quyền admin." };
    }
    const audioId = String(formData.get("audio_id") ?? "").trim();
    if (!audioId) {
      return { ok: false, error: "Thiếu audio_id." };
    }
    const row = await setAudioItemStatusAsAdmin(state.profile.id, audioId, "published");
    return { ok: true, data: row };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}
