import { defaultAudioPolicySettings } from "@/lib/settings/audio-policy-settings";
import {
  buildYoutubeEmbedUrl,
  parseYoutubeVideoId,
  validateExternalAudioUrl,
  validateYoutubeUrl
} from "@/src/lib/audio/audio-url";
import {
  assertStoryLevelAudioOnly,
  canShowAdsOnAudio,
  canUseBackgroundPlayback,
  canUseContinuousPlayback,
  getAudioCapabilities
} from "@/src/lib/audio/audio-policy";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function run(): void {
  const settings = {
    ...defaultAudioPolicySettings,
    blocked_external_audio_domains: ["blocked.example.com"]
  };

  const watchId = parseYoutubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  const shortId = parseYoutubeVideoId("https://youtu.be/dQw4w9WgXcQ");
  const embedId = parseYoutubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ");
  assert(watchId === "dQw4w9WgXcQ", "watch URL should parse");
  assert(shortId === "dQw4w9WgXcQ", "youtu.be URL should parse");
  assert(embedId === "dQw4w9WgXcQ", "embed URL should parse");
  assert(buildYoutubeEmbedUrl("dQw4w9WgXcQ") === "https://www.youtube.com/embed/dQw4w9WgXcQ", "embed URL build");

  const invalidUrl = validateExternalAudioUrl("not-a-url", settings);
  assert(!invalidUrl.ok && invalidUrl.reasonCode === "invalid_url", "invalid URL should fail");

  const blocked = validateExternalAudioUrl("https://blocked.example.com/song.mp3", settings);
  assert(!blocked.ok && blocked.reasonCode === "domain_blocked", "blocked domain should fail");

  const externalOk = validateExternalAudioUrl("https://cdn.example.com/audio/part-1.mp3", settings);
  assert(externalOk.ok, "direct audio URL should pass");

  const youtubeOk = validateYoutubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ", settings);
  assert(youtubeOk.ok, "youtube URL should pass");

  const storyOriginal = { id: "story-1", content_origin: "original", rights_status: "self_declared" };
  const storyTranslatedUnverified = { id: "story-2", content_origin: "translated", rights_status: "pending_review" };
  const storyTranslatedVerified = { id: "story-3", content_origin: "translated", rights_status: "verified" };
  const externalItem = { audio_source_type: "external_audio_url" as const, ads_policy: "inherit" as const };
  const youtubeItem = { audio_source_type: "youtube_embed" as const, ads_policy: "inherit" as const };

  assert(canUseBackgroundPlayback(storyOriginal, externalItem, settings), "external background should pass");
  assert(canUseContinuousPlayback(storyOriginal, externalItem, settings), "external continuous should pass");
  assert(!canUseBackgroundPlayback(storyOriginal, youtubeItem, settings), "youtube background should fail");
  assert(!canUseContinuousPlayback(storyOriginal, youtubeItem, settings), "youtube continuous should fail");

  assert(canShowAdsOnAudio(storyOriginal, externalItem, settings), "original + external ads should pass");
  assert(!canShowAdsOnAudio(storyTranslatedUnverified, externalItem, settings), "unverified translation ads should fail");
  assert(canShowAdsOnAudio(storyTranslatedVerified, externalItem, settings), "verified translation ads should pass");

  let chapterRejected = false;
  try {
    assertStoryLevelAudioOnly({ story_id: "story-1", chapter_id: "chapter-1" }, settings);
  } catch {
    chapterRejected = true;
  }
  assert(chapterRejected, "chapter_id should be rejected");

  const capabilities = getAudioCapabilities(storyOriginal, externalItem, settings);
  assert(capabilities.audioEnabled, "capabilities should be enabled");
  assert(capabilities.canUseBackgroundPlayback, "capabilities external background true");
  assert(capabilities.canUseContinuousPlayback, "capabilities external continuous true");

  const youtubeCapabilities = getAudioCapabilities(storyOriginal, youtubeItem, settings);
  assert(!youtubeCapabilities.canUseBackgroundPlayback, "youtube capabilities background false");
  assert(!youtubeCapabilities.canUseContinuousPlayback, "youtube capabilities continuous false");

  console.log("audio-url/policy checks passed");
}

run();
