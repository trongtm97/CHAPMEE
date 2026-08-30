import {
  defaultFilmAdaptationPolicySettings,
  type FilmAdaptationPolicySettings
} from "@/lib/settings/film-adaptation-settings";

const YOUTUBE_HOSTNAMES = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be"
]);

const YOUTUBE_VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;
const YOUTUBE_PLAYLIST_ID_REGEX = /^[a-zA-Z0-9_-]{10,}$/;

export type YoutubeEmbedType = "video" | "playlist";

export type YoutubeEmbedInput = {
  normalizedUrl: string | null;
  isYoutube: boolean;
  videoId: string | null;
  playlistId: string | null;
  embedType: YoutubeEmbedType | null;
  reasonCode: string | null;
};

export type YoutubeFilmUrlValidationResult = YoutubeEmbedInput & {
  ok: boolean;
};

function parseSafeUrl(url: string): URL | null {
  try {
    return new URL(url.trim());
  } catch {
    return null;
  }
}

function normalizeUrl(url: string): string | null {
  const parsed = parseSafeUrl(url);
  if (!parsed || !["http:", "https:"].includes(parsed.protocol)) {
    return null;
  }
  parsed.hash = "";
  parsed.hostname = parsed.hostname.toLowerCase();
  return parsed.toString();
}

function normalizeYoutubePlaylistId(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed || !YOUTUBE_PLAYLIST_ID_REGEX.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function normalizeYoutubeVideoId(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed || !YOUTUBE_VIDEO_ID_REGEX.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function parseInternal(url: string): YoutubeEmbedInput {
  const normalizedUrl = normalizeUrl(url);
  if (!normalizedUrl) {
    return {
      normalizedUrl: null,
      isYoutube: false,
      videoId: null,
      playlistId: null,
      embedType: null,
      reasonCode: "invalid_url"
    };
  }

  const parsed = new URL(normalizedUrl);
  const hostname = parsed.hostname.toLowerCase();
  if (!YOUTUBE_HOSTNAMES.has(hostname)) {
    return {
      normalizedUrl,
      isYoutube: false,
      videoId: null,
      playlistId: null,
      embedType: null,
      reasonCode: "not_youtube_url"
    };
  }

  const path = parsed.pathname;
  let videoId: string | null = null;
  let playlistId: string | null = null;
  let explicitPlaylistSelection = false;

  if (hostname === "youtu.be" || hostname === "www.youtu.be") {
    videoId = normalizeYoutubeVideoId(path.replace(/^\/+/, "").split("/")[0]);
    playlistId = normalizeYoutubePlaylistId(parsed.searchParams.get("list"));
  } else if (path === "/watch") {
    videoId = normalizeYoutubeVideoId(parsed.searchParams.get("v"));
    playlistId = normalizeYoutubePlaylistId(parsed.searchParams.get("list"));
  } else if (path === "/playlist") {
    playlistId = normalizeYoutubePlaylistId(parsed.searchParams.get("list"));
    explicitPlaylistSelection = true;
  } else if (path.startsWith("/embed/")) {
    videoId = normalizeYoutubeVideoId(path.split("/")[2]);
  } else if (path.startsWith("/shorts/")) {
    videoId = normalizeYoutubeVideoId(path.split("/")[2]);
  } else if (path.startsWith("/live/")) {
    videoId = normalizeYoutubeVideoId(path.split("/")[2]);
  } else if (path.startsWith("/embed/videoseries")) {
    playlistId = normalizeYoutubePlaylistId(parsed.searchParams.get("list"));
    explicitPlaylistSelection = true;
  }

  if (!videoId && !playlistId) {
    return {
      normalizedUrl,
      isYoutube: true,
      videoId: null,
      playlistId: null,
      embedType: null,
      reasonCode: "youtube_target_not_found"
    };
  }

  // Rule: if both exist, default to video unless URL is explicitly playlist-focused.
  const embedType: YoutubeEmbedType = explicitPlaylistSelection
    ? "playlist"
    : videoId
      ? "video"
      : "playlist";

  return {
    normalizedUrl,
    isYoutube: true,
    videoId,
    playlistId,
    embedType,
    reasonCode: null
  };
}

export function parseYoutubeVideoId(url: string): string | null {
  return parseInternal(url).videoId;
}

export function parseYoutubePlaylistId(url: string): string | null {
  return parseInternal(url).playlistId;
}

export function parseYoutubeEmbedInput(url: string): YoutubeEmbedInput {
  return parseInternal(url);
}

export function isYoutubeUrl(url: string): boolean {
  return parseInternal(url).isYoutube;
}

export function buildYoutubeVideoEmbedUrl(videoId: string): string | null {
  const normalized = normalizeYoutubeVideoId(videoId);
  if (!normalized) {
    return null;
  }
  return `https://www.youtube.com/embed/${normalized}`;
}

export function buildYoutubePlaylistEmbedUrl(playlistId: string): string | null {
  const normalized = normalizeYoutubePlaylistId(playlistId);
  if (!normalized) {
    return null;
  }
  return `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(normalized)}`;
}

export function buildYoutubeWatchUrl(videoId: string): string | null {
  const normalized = normalizeYoutubeVideoId(videoId);
  if (!normalized) {
    return null;
  }
  return `https://www.youtube.com/watch?v=${encodeURIComponent(normalized)}`;
}

export function buildYoutubePlaylistUrl(playlistId: string): string | null {
  const normalized = normalizeYoutubePlaylistId(playlistId);
  if (!normalized) {
    return null;
  }
  return `https://www.youtube.com/playlist?list=${encodeURIComponent(normalized)}`;
}

export function getYoutubeThumbnailUrl(videoId: string): string | null {
  const normalized = normalizeYoutubeVideoId(videoId);
  if (!normalized) {
    return null;
  }
  return `https://img.youtube.com/vi/${encodeURIComponent(normalized)}/hqdefault.jpg`;
}

export function validateYoutubeFilmUrl(
  url: string,
  settings?: FilmAdaptationPolicySettings
): YoutubeFilmUrlValidationResult {
  const config = settings ?? defaultFilmAdaptationPolicySettings;
  const parsed = parseInternal(url);

  if (!config.film_adaptations_enabled) {
    return { ...parsed, ok: false, reasonCode: "film_adaptations_disabled" };
  }
  if (config.film_adaptations_youtube_only && !parsed.isYoutube) {
    return { ...parsed, ok: false, reasonCode: "youtube_only_policy" };
  }
  if (!parsed.isYoutube) {
    return { ...parsed, ok: false, reasonCode: parsed.reasonCode ?? "not_youtube_url" };
  }
  if (!parsed.embedType) {
    return { ...parsed, ok: false, reasonCode: parsed.reasonCode ?? "youtube_target_not_found" };
  }
  if (parsed.embedType === "video" && !config.allow_youtube_video) {
    return { ...parsed, ok: false, reasonCode: "youtube_video_disabled" };
  }
  if (parsed.embedType === "playlist" && !config.allow_youtube_playlist) {
    return { ...parsed, ok: false, reasonCode: "youtube_playlist_disabled" };
  }

  return { ...parsed, ok: true, reasonCode: null };
}
