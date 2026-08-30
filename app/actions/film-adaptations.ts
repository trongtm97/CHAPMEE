"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { requireCreatorProfile } from "@/lib/creator/require-creator-profile";
import { getFilmAdaptationPolicySettings } from "@/lib/settings/film-adaptation-settings";
import {
  createFilmAdaptation,
  deleteFilmAdaptation,
  FilmAdaptationsError,
  hideFilmAdaptation,
  publishFilmAdaptation,
  submitFilmAdaptationForReview,
  updateFilmAdaptation,
  type FilmAdaptationInput
} from "@/src/lib/film-adaptations/film-adaptations";
import { validateYoutubeFilmUrl } from "@/src/lib/film-adaptations/youtube";

type FilmActionResult<T = unknown> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string };

function normalizeInput(formData: FormData): FilmAdaptationInput {
  const toNumber = (value: FormDataEntryValue | null) => {
    if (value == null || String(value).trim() === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  return {
    story_id: String(formData.get("story_id") ?? "").trim() || null,
    chapter_id: String(formData.get("chapter_id") ?? "").trim() || null,
    youtube_url: String(formData.get("youtube_url") ?? "").trim() || null,
    youtube_embed_type: (String(formData.get("youtube_embed_type") ?? "").trim() ||
      "video") as FilmAdaptationInput["youtube_embed_type"],
    title: String(formData.get("title") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
    creative_note: String(formData.get("creative_note") ?? "").trim() || null,
    relation_type: String(formData.get("relation_type") ?? "").trim() || null,
    language: String(formData.get("language") ?? "").trim() || null,
    duration_seconds: toNumber(formData.get("duration_seconds")),
    sort_order: toNumber(formData.get("sort_order")),
    is_free: true,
    price: toNumber(formData.get("price")),
    price_coins: toNumber(formData.get("price_coins")),
    coin_unlock_price: toNumber(formData.get("coin_unlock_price")),
    unlock_type: String(formData.get("unlock_type") ?? "").trim() || null,
    background_playback_allowed:
      formData.get("background_playback_allowed") === "1" ||
      formData.get("background_playback_allowed") === "true",
    audio_only: formData.get("audio_only") === "1" || formData.get("audio_only") === "true",
    source_type: String(formData.get("source_type") ?? "").trim() || null,
    status_intent: (String(formData.get("status_intent") ?? "").trim() as FilmAdaptationInput["status_intent"]) || "draft"
  };
}

async function requireCreatorSession(nextPath = "/studio") {
  const { creatorProfile } = await requireCreatorProfile(nextPath);
  const state = await getCurrentProfile();
  if (!state.profile) {
    throw new Error("Bạn cần đăng nhập.");
  }
  return {
    creatorProfile,
    profileIdForDb: state.profile.id
  };
}

async function assertRightsDeclarationAccepted(_formData: FormData) {
  const settings = await getFilmAdaptationPolicySettings();
  if (!settings.require_rights_declaration) {
    return;
  }
  // Implicit consent: saving/publishing video implies rights acceptance (see UI notice).
}

function toActionError(error: unknown): string {
  if (error instanceof FilmAdaptationsError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Đã có lỗi xảy ra.";
}

function revalidateFilmsPage(storyId: string) {
  revalidatePath(`/studio/stories/${storyId}/films`);
}

export async function createFilmAdaptationAction(formData: FormData): Promise<FilmActionResult> {
  try {
    const { creatorProfile, profileIdForDb } = await requireCreatorSession();
    await assertRightsDeclarationAccepted(formData);
    const created = await createFilmAdaptation(profileIdForDb, creatorProfile, normalizeInput(formData));
    revalidateFilmsPage(created.story_id);
    return { ok: true, data: created };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function updateFilmAdaptationAction(formData: FormData): Promise<FilmActionResult> {
  try {
    const { creatorProfile, profileIdForDb } = await requireCreatorSession();
    await assertRightsDeclarationAccepted(formData);
    const filmId = String(formData.get("film_id") ?? "").trim();
    if (!filmId) {
      return { ok: false, error: "Thiếu film_id." };
    }
    const updated = await updateFilmAdaptation(
      profileIdForDb,
      creatorProfile,
      filmId,
      normalizeInput(formData)
    );
    revalidateFilmsPage(updated.story_id);
    return { ok: true, data: updated };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function deleteFilmAdaptationAction(
  formData: FormData
): Promise<FilmActionResult<{ deleted: true }>> {
  try {
    const { creatorProfile, profileIdForDb } = await requireCreatorSession();
    const filmId = String(formData.get("film_id") ?? "").trim();
    const storyId = String(formData.get("story_id") ?? "").trim();
    if (!filmId) {
      return { ok: false, error: "Thiếu film_id." };
    }
    await deleteFilmAdaptation(profileIdForDb, creatorProfile, filmId);
    if (storyId) {
      revalidateFilmsPage(storyId);
    }
    return { ok: true, data: { deleted: true } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function submitFilmAdaptationForReviewAction(
  formData: FormData
): Promise<FilmActionResult> {
  try {
    const { creatorProfile, profileIdForDb } = await requireCreatorSession();
    const filmId = String(formData.get("film_id") ?? "").trim();
    if (!filmId) {
      return { ok: false, error: "Thiếu film_id." };
    }
    const row = await submitFilmAdaptationForReview(profileIdForDb, creatorProfile, filmId);
    revalidateFilmsPage(row.story_id);
    return { ok: true, data: row, message: "Đã gửi duyệt." };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function publishFilmAdaptationAction(formData: FormData): Promise<FilmActionResult> {
  try {
    const { creatorProfile, profileIdForDb } = await requireCreatorSession();
    const filmId = String(formData.get("film_id") ?? "").trim();
    if (!filmId) {
      return { ok: false, error: "Thiếu film_id." };
    }
    const row = await publishFilmAdaptation(profileIdForDb, creatorProfile, filmId);
    revalidateFilmsPage(row.story_id);
    return { ok: true, data: row, message: "Đã xuất bản." };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function hideFilmAdaptationAction(formData: FormData): Promise<FilmActionResult> {
  try {
    const { creatorProfile, profileIdForDb } = await requireCreatorSession();
    const filmId = String(formData.get("film_id") ?? "").trim();
    if (!filmId) {
      return { ok: false, error: "Thiếu film_id." };
    }
    const row = await hideFilmAdaptation(profileIdForDb, creatorProfile, filmId);
    revalidateFilmsPage(row.story_id);
    return { ok: true, data: row, message: "Đã ẩn phim." };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function validateFilmYoutubeUrlAction(
  formData: FormData
): Promise<FilmActionResult<{ ok: boolean; reasonCode: string | null; embedType: string | null }>> {
  try {
    await requireCreatorSession();
    const url = String(formData.get("youtube_url") ?? "").trim();
    const embedType = String(formData.get("youtube_embed_type") ?? "video").trim();
    const settings = await getFilmAdaptationPolicySettings();
    const result = validateYoutubeFilmUrl(url, settings);

    if (!result.ok) {
      return {
        ok: true,
        data: {
          ok: false,
          reasonCode: result.reasonCode,
          embedType: result.embedType
        },
        message: "URL không hợp lệ."
      };
    }

    if (embedType === "playlist" && !result.playlistId) {
      return {
        ok: true,
        data: { ok: false, reasonCode: "playlist_required", embedType: "playlist" },
        message: "URL không chứa playlist hợp lệ."
      };
    }
    if (embedType === "video" && !result.videoId) {
      return {
        ok: true,
        data: { ok: false, reasonCode: "video_required", embedType: "video" },
        message: "URL không chứa video hợp lệ."
      };
    }

    return {
      ok: true,
      data: {
        ok: true,
        reasonCode: null,
        embedType
      },
      message: "URL YouTube hợp lệ."
    };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}
