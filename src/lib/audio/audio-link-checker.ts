import { getAudioPolicySettings } from "@/lib/settings/audio-policy-settings";
import { parseYoutubeVideoId, validateExternalAudioUrl, validateYoutubeUrl } from "@/src/lib/audio/audio-url";

export type AudioLinkCheckOutcome = "ok" | "failed" | "unknown" | "skipped";

export type AudioLinkCheckInputRow = {
  id: string;
  story_id: string;
  title: string;
  audio_source_type: string;
  status: string;
  external_audio_url: string | null;
  normalized_external_audio_url: string | null;
  youtube_url: string | null;
  youtube_video_id: string | null;
};

export type AudioLinkCheckRow = {
  audioItemId: string;
  storyId: string;
  title: string;
  sourceType: string;
  status: string;
  outcome: AudioLinkCheckOutcome;
  error: string | null;
};

export type AudioLinkCheckSummary = {
  checked: number;
  ok: number;
  failed: number;
  unknown: number;
  skipped: number;
  errors: number;
  rows: AudioLinkCheckRow[];
};

const REQUEST_TIMEOUT_MS = 8_000;
const MAX_GET_BYTES = 8_192;

async function headOrMinimalGet(url: string): Promise<{ ok: boolean; error: string | null }> {
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
    // fall through to GET probe
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
      headers: { Range: `bytes=0-${MAX_GET_BYTES - 1}` }
    });
    if (response.ok || response.status === 206 || response.status === 403) {
      return { ok: true, error: null };
    }
    return { ok: false, error: `HTTP ${response.status}` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(getTimeout);
  }
}

export async function checkExternalAudioLink(url: string): Promise<AudioLinkCheckOutcome> {
  const settings = await getAudioPolicySettings();
  const validation = validateExternalAudioUrl(url, settings);
  if (!validation.ok || !validation.normalizedUrl) {
    return "failed";
  }
  const probe = await headOrMinimalGet(validation.normalizedUrl);
  return probe.ok ? "ok" : "failed";
}

export async function checkYoutubeAudioLink(
  youtubeUrl: string | null,
  youtubeVideoId: string | null
): Promise<AudioLinkCheckOutcome> {
  const settings = await getAudioPolicySettings();
  if (youtubeVideoId && /^[a-zA-Z0-9_-]{11}$/.test(youtubeVideoId)) {
    return "ok";
  }
  if (!youtubeUrl) {
    return "failed";
  }
  const validation = validateYoutubeUrl(youtubeUrl, settings);
  if (!validation.ok) {
    return "failed";
  }
  const parsed = parseYoutubeVideoId(youtubeUrl);
  return parsed ? "ok" : "failed";
}

export async function checkAudioLinkRow(row: AudioLinkCheckInputRow): Promise<{
  outcome: AudioLinkCheckOutcome;
  error: string | null;
}> {
  if (row.status === "draft" || row.status === "rejected") {
    return { outcome: "skipped", error: null };
  }

  if (row.audio_source_type === "external_audio_url") {
    const url = row.normalized_external_audio_url ?? row.external_audio_url ?? "";
    if (!url) {
      return { outcome: "failed", error: "missing_external_audio_url" };
    }
    const outcome = await checkExternalAudioLink(url);
    return { outcome, error: outcome === "failed" ? "external_probe_failed" : null };
  }

  if (row.audio_source_type === "youtube_embed") {
    const outcome = await checkYoutubeAudioLink(row.youtube_url, row.youtube_video_id);
    return { outcome, error: outcome === "failed" ? "youtube_invalid" : null };
  }

  return { outcome: "unknown", error: "unsupported_source_type" };
}

export async function summarizeAudioLinkChecks(rows: AudioLinkCheckInputRow[]): Promise<AudioLinkCheckSummary> {
  const summary: AudioLinkCheckSummary = {
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
        audioItemId: row.id,
        storyId: row.story_id,
        title: row.title,
        sourceType: row.audio_source_type,
        status: row.status,
        outcome: "skipped",
        error: null
      });
      continue;
    }

    summary.checked += 1;
    let outcome: AudioLinkCheckOutcome = "unknown";
    let checkError: string | null = null;
    try {
      const result = await checkAudioLinkRow(row);
      outcome = result.outcome;
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
      audioItemId: row.id,
      storyId: row.story_id,
      title: row.title,
      sourceType: row.audio_source_type,
      status: row.status,
      outcome,
      error: checkError
    });
  }

  return summary;
}
