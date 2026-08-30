import "server-only";

import { assertCreatorOwnsStory } from "@/lib/auth/ownership";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import { getAudioPolicySettings } from "@/lib/settings/audio-policy-settings";
import {
  buildStoryAudioCapabilities,
  canShowAdsOnAudio,
  getAudioCapabilities,
  type AudioPolicyResult
} from "@/src/lib/audio/audio-policy";
import {
  getStoryAudioItems,
  getStoryAudioSummary,
  type AudioItemRow
} from "@/src/lib/audio/audio-items";

export type StudioAudioPageData = {
  story: {
    id: string;
    title: string;
    slug: string;
    contentOrigin: string | null;
    rightsStatus: string | null;
  };
  items: AudioItemRow[];
  summary: Awaited<ReturnType<typeof getStoryAudioSummary>>;
  capabilities: AudioPolicyResult;
  storyCapabilities: AudioPolicyResult;
  canShowAdsExample: boolean;
  adsDisabledReason: string | null;
  error: string | null;
};

export async function getStudioAudioPageData(
  creatorProfile: CreatorProfile,
  storyId: string
): Promise<StudioAudioPageData> {
  try {
    const owned = await assertCreatorOwnsStory(creatorProfile, storyId);
    const [items, summary, settings] = await Promise.all([
      getStoryAudioItems(storyId, { includeUnpublished: true, limit: 200 }),
      getStoryAudioSummary(storyId),
      getAudioPolicySettings()
    ]);

    const storyContext = {
      id: storyId,
      content_origin: owned.content_origin,
      rights_status: null
    };

    const storyCapabilities = buildStoryAudioCapabilities(storyContext, settings);
    const sampleExternal = {
      audio_source_type: "external_audio_url" as const,
      rights_status: "self_declared" as const,
      ads_policy: "inherit" as const
    };
    const canShowAdsExample = canShowAdsOnAudio(storyContext, sampleExternal, settings);

    let adsDisabledReason: string | null = null;
    if (!canShowAdsExample) {
      const origin = String(owned.content_origin ?? "original").toLowerCase();
      if (origin === "translated" || origin === "translation") {
        adsDisabledReason =
          "Truyện dịch chưa xác minh quyền: quảng cáo audio thường bị tắt theo chính sách.";
      } else if (!settings.audio_ads_enabled || !settings.external_audio_ads_enabled) {
        adsDisabledReason = "Quảng cáo audio đang tắt trong cài đặt hệ thống.";
      }
    }

    const capabilities = getAudioCapabilities(storyContext, sampleExternal, settings);

    return {
      story: {
        id: storyId,
        title: owned.title,
        slug: owned.slug,
        contentOrigin: owned.content_origin,
        rightsStatus: null
      },
      items,
      summary,
      capabilities,
      storyCapabilities,
      canShowAdsExample,
      adsDisabledReason,
      error: null
    };
  } catch (error) {
    return {
      story: {
        id: storyId,
        title: "",
        slug: "",
        contentOrigin: null,
        rightsStatus: null
      },
      items: [],
      summary: { total: 0, published: 0, external: 0, youtube: 0 },
      capabilities: buildStoryAudioCapabilities({ id: storyId }),
      storyCapabilities: buildStoryAudioCapabilities({ id: storyId }),
      canShowAdsExample: false,
      adsDisabledReason: null,
      error: error instanceof Error ? error.message : "Không tải được trang audio."
    };
  }
}
