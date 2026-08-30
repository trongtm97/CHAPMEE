import { getFilmAdaptationPolicySettings } from "@/lib/settings/film-adaptation-settings";
import {
  buildYoutubePlaylistEmbedUrl,
  buildYoutubePlaylistUrl,
  buildYoutubeVideoEmbedUrl,
  buildYoutubeWatchUrl,
  validateYoutubeFilmUrl
} from "@/src/lib/film-adaptations/youtube";

export type FilmYoutubeCheckOutcome = "ok" | "failed" | "unknown" | "skipped";

export type FilmYoutubeCheckInputRow = {
  id: string;
  story_id: string;
  title: string;
  status: string;
  youtube_url: string;
  youtube_video_id: string | null;
  youtube_playlist_id: string | null;
  youtube_embed_type: string;
};

export type FilmYoutubeCheckRow = {
  filmId: string;
  storyId: string;
  title: string;
  embedType: string;
  status: string;
  outcome: FilmYoutubeCheckOutcome;
  embedUrl: string | null;
  error: string | null;
};

export type FilmYoutubeCheckSummary = {
  checked: number;
  ok: number;
  failed: number;
  unknown: number;
  skipped: number;
  errors: number;
  rows: FilmYoutubeCheckRow[];
};

const REQUEST_TIMEOUT_MS = 8_000;
const ENABLE_OEMBED_PROBE = process.env.FILM_YOUTUBE_OEMBED_PROBE === "1";

async function probeUrl(url: string): Promise<{ ok: boolean; error: string | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const head = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal
    });
    if (head.ok || head.status === 405 || head.status === 403) {
      return { ok: true, error: null };
    }
  } catch {
    // fall through
  } finally {
    clearTimeout(timeout);
  }

  const getController = new AbortController();
  const getTimeout = setTimeout(() => getController.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: getController.signal,
      headers: { Accept: "application/json" }
    });
    if (response.ok) {
      return { ok: true, error: null };
    }
    return { ok: false, error: `HTTP ${response.status}` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(getTimeout);
  }
}

async function probeOembed(watchOrPlaylistUrl: string): Promise<FilmYoutubeCheckOutcome> {
  if (!ENABLE_OEMBED_PROBE) {
    return "unknown";
  }
  const oembedUrl = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchOrPlaylistUrl)}`;
  const result = await probeUrl(oembedUrl);
  return result.ok ? "ok" : "failed";
}

export function resolveFilmEmbedUrl(row: FilmYoutubeCheckInputRow): string | null {
  if (row.youtube_embed_type === "playlist") {
    const playlistId = row.youtube_playlist_id?.trim() ?? "";
    return buildYoutubePlaylistEmbedUrl(playlistId);
  }
  const videoId = row.youtube_video_id?.trim() ?? "";
  return buildYoutubeVideoEmbedUrl(videoId);
}

export async function checkFilmYoutubeRow(
  row: FilmYoutubeCheckInputRow
): Promise<{ outcome: FilmYoutubeCheckOutcome; embedUrl: string | null; error: string | null }> {
  if (row.status === "draft" || row.status === "rejected") {
    return { outcome: "skipped", embedUrl: null, error: null };
  }

  const settings = await getFilmAdaptationPolicySettings();
  const validation = validateYoutubeFilmUrl(row.youtube_url, settings);
  if (!validation.ok) {
    return {
      outcome: "failed",
      embedUrl: null,
      error: validation.reasonCode ?? "youtube_invalid"
    };
  }

  const embedType = row.youtube_embed_type === "playlist" ? "playlist" : "video";
  const videoId = validation.videoId ?? row.youtube_video_id;
  const playlistId = validation.playlistId ?? row.youtube_playlist_id;

  if (embedType === "playlist") {
    if (!playlistId?.trim()) {
      return { outcome: "failed", embedUrl: null, error: "missing_playlist_id" };
    }
    const embedUrl = buildYoutubePlaylistEmbedUrl(playlistId);
    if (!embedUrl) {
      return { outcome: "failed", embedUrl: null, error: "invalid_playlist_id_format" };
    }
    const watchUrl = buildYoutubePlaylistUrl(playlistId);
    if (!watchUrl) {
      return { outcome: "failed", embedUrl, error: "invalid_playlist_url" };
    }
    const probe = await probeOembed(watchUrl);
    if (probe === "ok") {
      return { outcome: "ok", embedUrl, error: null };
    }
    if (probe === "failed") {
      return { outcome: "failed", embedUrl, error: "oembed_probe_failed" };
    }
    return { outcome: "ok", embedUrl, error: null };
  }

  if (!videoId?.trim()) {
    return { outcome: "failed", embedUrl: null, error: "missing_video_id" };
  }
  const embedUrl = buildYoutubeVideoEmbedUrl(videoId);
  if (!embedUrl) {
    return { outcome: "failed", embedUrl: null, error: "invalid_video_id_format" };
  }
  const watchUrl = buildYoutubeWatchUrl(videoId);
  if (!watchUrl) {
    return { outcome: "failed", embedUrl, error: "invalid_watch_url" };
  }
  const probe = await probeOembed(watchUrl);
  if (probe === "ok") {
    return { outcome: "ok", embedUrl, error: null };
  }
  if (probe === "failed") {
    return { outcome: "failed", embedUrl, error: "oembed_probe_failed" };
  }
  return { outcome: "ok", embedUrl, error: null };
}

export async function summarizeFilmYoutubeChecks(
  rows: FilmYoutubeCheckInputRow[]
): Promise<FilmYoutubeCheckSummary> {
  const summary: FilmYoutubeCheckSummary = {
    checked: 0,
    ok: 0,
    failed: 0,
    unknown: 0,
    skipped: 0,
    errors: 0,
    rows: []
  };

  for (const row of rows) {
    if (row.status === "draft" || row.status === "rejected") {
      summary.skipped += 1;
      summary.rows.push({
        filmId: row.id,
        storyId: row.story_id,
        title: row.title,
        embedType: row.youtube_embed_type,
        status: row.status,
        outcome: "skipped",
        embedUrl: null,
        error: null
      });
      continue;
    }

    summary.checked += 1;
    let outcome: FilmYoutubeCheckOutcome = "unknown";
    let embedUrl: string | null = null;
    let checkError: string | null = null;
    try {
      const result = await checkFilmYoutubeRow(row);
      outcome = result.outcome;
      embedUrl = result.embedUrl;
      checkError = result.error;
    } catch (error) {
      outcome = "unknown";
      checkError = error instanceof Error ? error.message : String(error);
      summary.errors += 1;
    }

    if (outcome === "ok") summary.ok += 1;
    if (outcome === "failed") summary.failed += 1;
    if (outcome === "unknown") summary.unknown += 1;

    summary.rows.push({
      filmId: row.id,
      storyId: row.story_id,
      title: row.title,
      embedType: row.youtube_embed_type,
      status: row.status,
      outcome,
      embedUrl,
      error: checkError
    });
  }

  return summary;
}
