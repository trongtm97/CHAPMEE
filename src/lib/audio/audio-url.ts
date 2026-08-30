import type { AudioPolicySettings } from "@/lib/settings/audio-policy-settings";

const DIRECT_AUDIO_EXTENSIONS = [".mp3", ".m4a", ".aac", ".ogg", ".wav", ".webm"];
const YOUTUBE_HOSTNAMES = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be"
]);

export type AudioUrlValidationResult = {
  ok: boolean;
  normalizedUrl: string | null;
  hostname: string | null;
  providerName: string;
  reasonCode: string | null;
  isLikelyDirectAudioUrl: boolean;
  youtubeVideoId: string | null;
};

function parseSafeUrl(url: string): URL | null {
  try {
    return new URL(url.trim());
  } catch {
    return null;
  }
}

function normalizeDomainValue(value: string): string {
  return value.trim().toLowerCase().replace(/^www\./, "");
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidYoutubeVideoId(videoId: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
}

export function normalizeAudioUrl(url: string): string | null {
  const parsed = parseSafeUrl(url);
  if (!parsed || !["http:", "https:"].includes(parsed.protocol)) {
    return null;
  }
  parsed.hash = "";
  parsed.hostname = parsed.hostname.toLowerCase();
  return parsed.toString();
}

export function getHostname(url: string): string | null {
  const normalized = normalizeAudioUrl(url);
  if (!normalized) {
    return null;
  }
  const parsed = new URL(normalized);
  return parsed.hostname.toLowerCase();
}

export function isYoutubeUrl(url: string): boolean {
  const hostname = getHostname(url);
  if (!hostname) {
    return false;
  }
  return YOUTUBE_HOSTNAMES.has(hostname);
}

export function parseYoutubeVideoId(url: string): string | null {
  const normalized = normalizeAudioUrl(url);
  if (!normalized) {
    return null;
  }
  const parsed = new URL(normalized);
  const hostname = parsed.hostname.toLowerCase();
  const path = parsed.pathname;

  if (hostname === "youtu.be" || hostname === "www.youtu.be") {
    const maybeId = path.replace(/^\/+/, "").split("/")[0] ?? "";
    return isValidYoutubeVideoId(maybeId) ? maybeId : null;
  }

  if (!YOUTUBE_HOSTNAMES.has(hostname)) {
    return null;
  }

  if (path === "/watch") {
    const videoId = parsed.searchParams.get("v") ?? "";
    return isValidYoutubeVideoId(videoId) ? videoId : null;
  }

  if (path.startsWith("/embed/")) {
    const maybeId = path.split("/")[2] ?? "";
    return isValidYoutubeVideoId(maybeId) ? maybeId : null;
  }

  if (path.startsWith("/shorts/")) {
    const maybeId = path.split("/")[2] ?? "";
    return isValidYoutubeVideoId(maybeId) ? maybeId : null;
  }

  return null;
}

export function buildYoutubeEmbedUrl(videoId: string): string | null {
  if (!isValidYoutubeVideoId(videoId)) {
    return null;
  }
  return `https://www.youtube.com/embed/${videoId}`;
}

export function detectAudioProvider(url: string): string {
  const hostname = getHostname(url);
  if (!hostname) {
    return "unknown";
  }
  const domain = hostname.replace(/^www\./, "");
  if (domain.includes("youtube.com") || domain.includes("youtu.be")) {
    return "youtube";
  }
  return domain;
}

export function isLikelyDirectAudioUrl(url: string): boolean {
  const normalized = normalizeAudioUrl(url);
  if (!normalized) {
    return false;
  }
  const parsed = new URL(normalized);
  const pathname = parsed.pathname.toLowerCase();
  return DIRECT_AUDIO_EXTENSIONS.some((ext) => pathname.endsWith(ext));
}

export function isDomainAllowed(hostname: string, settings: AudioPolicySettings): boolean {
  const domain = normalizeDomainValue(hostname);
  const allowList = settings.allowed_external_audio_domains.map(normalizeDomainValue).filter(Boolean);
  if (allowList.length === 0) {
    return true;
  }
  return allowList.some((item) => domain === item || domain.endsWith(`.${item}`));
}

export function isDomainBlocked(hostname: string, settings: AudioPolicySettings): boolean {
  const domain = normalizeDomainValue(hostname);
  const blockList = settings.blocked_external_audio_domains.map(normalizeDomainValue).filter(Boolean);
  return blockList.some((item) => domain === item || domain.endsWith(`.${item}`));
}

export function validateExternalAudioUrl(url: string, settings: AudioPolicySettings): AudioUrlValidationResult {
  if (!settings.external_audio_enabled) {
    return {
      ok: false,
      normalizedUrl: null,
      hostname: null,
      providerName: "unknown",
      reasonCode: "external_audio_disabled",
      isLikelyDirectAudioUrl: false,
      youtubeVideoId: null
    };
  }

  const normalized = normalizeAudioUrl(url);
  if (!normalized) {
    return {
      ok: false,
      normalizedUrl: null,
      hostname: null,
      providerName: "unknown",
      reasonCode: "invalid_url",
      isLikelyDirectAudioUrl: false,
      youtubeVideoId: null
    };
  }

  const hostname = getHostname(normalized);
  const providerName = detectAudioProvider(normalized);
  if (!hostname) {
    return {
      ok: false,
      normalizedUrl: normalized,
      hostname: null,
      providerName,
      reasonCode: "invalid_hostname",
      isLikelyDirectAudioUrl: false,
      youtubeVideoId: null
    };
  }

  if (isYoutubeUrl(normalized)) {
    return {
      ok: false,
      normalizedUrl: normalized,
      hostname,
      providerName,
      reasonCode: "youtube_not_external_audio",
      isLikelyDirectAudioUrl: false,
      youtubeVideoId: parseYoutubeVideoId(normalized)
    };
  }

  if (isDomainBlocked(hostname, settings)) {
    return {
      ok: false,
      normalizedUrl: normalized,
      hostname,
      providerName,
      reasonCode: "domain_blocked",
      isLikelyDirectAudioUrl: isLikelyDirectAudioUrl(normalized),
      youtubeVideoId: null
    };
  }

  if (!isDomainAllowed(hostname, settings)) {
    return {
      ok: false,
      normalizedUrl: normalized,
      hostname,
      providerName,
      reasonCode: "domain_not_allowlisted",
      isLikelyDirectAudioUrl: isLikelyDirectAudioUrl(normalized),
      youtubeVideoId: null
    };
  }

  const directAudio = isLikelyDirectAudioUrl(normalized);
  if (!directAudio && settings.allowed_external_audio_domains.length === 0) {
    return {
      ok: false,
      normalizedUrl: normalized,
      hostname,
      providerName,
      reasonCode: "not_direct_audio_url",
      isLikelyDirectAudioUrl: false,
      youtubeVideoId: null
    };
  }

  return {
    ok: true,
    normalizedUrl: normalized,
    hostname,
    providerName,
    reasonCode: null,
    isLikelyDirectAudioUrl: directAudio,
    youtubeVideoId: null
  };
}

export function validateYoutubeUrl(url: string, settings: AudioPolicySettings): AudioUrlValidationResult {
  if (!settings.youtube_embed_enabled) {
    return {
      ok: false,
      normalizedUrl: null,
      hostname: null,
      providerName: "youtube",
      reasonCode: "youtube_embed_disabled",
      isLikelyDirectAudioUrl: false,
      youtubeVideoId: null
    };
  }

  const normalized = normalizeAudioUrl(url);
  if (!normalized) {
    return {
      ok: false,
      normalizedUrl: null,
      hostname: null,
      providerName: "youtube",
      reasonCode: "invalid_url",
      isLikelyDirectAudioUrl: false,
      youtubeVideoId: null
    };
  }

  if (!isYoutubeUrl(normalized)) {
    return {
      ok: false,
      normalizedUrl: normalized,
      hostname: getHostname(normalized),
      providerName: detectAudioProvider(normalized),
      reasonCode: "not_youtube_url",
      isLikelyDirectAudioUrl: false,
      youtubeVideoId: null
    };
  }

  const videoId = parseYoutubeVideoId(normalized);
  if (!isNonEmptyString(videoId)) {
    return {
      ok: false,
      normalizedUrl: normalized,
      hostname: getHostname(normalized),
      providerName: "youtube",
      reasonCode: "invalid_youtube_video_id",
      isLikelyDirectAudioUrl: false,
      youtubeVideoId: null
    };
  }

  return {
    ok: true,
    normalizedUrl: normalized,
    hostname: getHostname(normalized),
    providerName: "youtube",
    reasonCode: null,
    isLikelyDirectAudioUrl: false,
    youtubeVideoId: videoId
  };
}
