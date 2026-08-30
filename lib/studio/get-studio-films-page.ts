import "server-only";

import { assertCreatorOwnsStory } from "@/lib/auth/ownership";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import { getFilmAdaptationPolicySettings } from "@/lib/settings/film-adaptation-settings";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import {
  countFilmAdaptationsForStory,
  getStoryFilmAdaptations,
  type FilmAdaptationRow
} from "@/src/lib/film-adaptations/film-adaptations";
import {
  canCreateFilmAdaptation,
  canShowAdsOnFilmAdaptation,
  getFilmAdaptationCapabilities,
  type FilmAdaptationPolicyResult
} from "@/src/lib/film-adaptations/film-policy";

export type StudioFilmsPageData = {
  story: {
    id: string;
    title: string;
    slug: string;
    publicCode: string | null;
    contentOrigin: string | null;
    rightsStatus: string | null;
    status: string | null;
    href: string;
  };
  items: FilmAdaptationRow[];
  totalCount: number;
  capabilities: FilmAdaptationPolicyResult;
  canShowAdsExample: boolean;
  adsDisabledReason: string | null;
  creativeDisclaimerText: string;
  discoverTabLabel: string;
  error: string | null;
};

export async function getStudioFilmsPageData(
  creatorProfile: CreatorProfile,
  storyId: string
): Promise<StudioFilmsPageData> {
  try {
    const owned = await assertCreatorOwnsStory(creatorProfile, storyId);
    const [items, totalCount, settings] = await Promise.all([
      getStoryFilmAdaptations(storyId, { includeUnpublished: true, limit: 200 }),
      countFilmAdaptationsForStory(storyId),
      getFilmAdaptationPolicySettings()
    ]);

    const storyContext = {
      id: storyId,
      content_origin: owned.content_origin,
      rights_status: null,
      status: owned.status,
      isPublished: owned.status === "published"
    };

    const profile = { isCreator: true, isAdmin: false };
    const capabilities = getFilmAdaptationCapabilities(storyContext, undefined, settings);
    capabilities.canCreate = canCreateFilmAdaptation(profile, storyContext, settings);

    const sampleFilm = {
      story_id: storyId,
      youtube_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      youtube_embed_type: "video" as const,
      relation_type: "based_on_story",
      is_free: true,
      rights_status: "self_declared",
      ads_policy: "inherit" as const
    };

    const canShowAdsExample = canShowAdsOnFilmAdaptation(storyContext, sampleFilm, settings);
    let adsDisabledReason: string | null = null;
    if (!canShowAdsExample) {
      const origin = String(owned.content_origin ?? "original").toLowerCase();
      if (origin === "translation" || origin === "translated") {
        adsDisabledReason =
          "Truyện dịch chưa xác minh quyền: quảng cáo cạnh phim thường bị tắt theo chính sách.";
      } else if (!settings.film_ads_enabled) {
        adsDisabledReason = "Quảng cáo phim đang tắt trong cài đặt hệ thống.";
      } else if (!settings.youtube_embed_ads_on_film_pages_enabled) {
        adsDisabledReason =
          "Quảng cáo cạnh iframe YouTube đang tắt (youtube_embed_ads_on_film_pages_enabled).";
      }
    }

    return {
      story: {
        id: storyId,
        title: owned.title,
        slug: owned.slug,
        publicCode: owned.public_code,
        contentOrigin: owned.content_origin,
        rightsStatus: null,
        status: owned.status,
        href: owned.public_code
          ? getStoryDetailHref({ slug: owned.slug, public_code: owned.public_code })
          : `/truyen/${owned.slug}`
      },
      items,
      totalCount,
      capabilities,
      canShowAdsExample,
      adsDisabledReason,
      creativeDisclaimerText: settings.creative_disclaimer_text,
      discoverTabLabel: settings.discover_tab_label,
      error: null
    };
  } catch (error) {
    return {
      story: {
        id: storyId,
        title: "",
        slug: "",
        publicCode: null,
        contentOrigin: null,
        rightsStatus: null,
        status: null,
        href: "#"
      },
      items: [],
      totalCount: 0,
      capabilities: getFilmAdaptationCapabilities({ id: storyId }),
      canShowAdsExample: false,
      adsDisabledReason: null,
      creativeDisclaimerText: "",
      discoverTabLabel: "Phim chuyển thể",
      error: error instanceof Error ? error.message : "Không tải được trang phim chuyển thể."
    };
  }
}
