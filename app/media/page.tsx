import type { Metadata } from "next";
import { Suspense } from "react";
import { MediaEmptyState } from "@/components/media/MediaEmptyState";
import { MediaGrid } from "@/components/media/MediaGrid";
import { MediaHero } from "@/components/media/MediaHero";
import { MediaCatalogFilterSection } from "@/components/media/MediaCatalogFilterSection";
import { MediaResultsToolbar } from "@/components/media/MediaResultsToolbar";
import { CatalogPagination } from "@/components/catalog/CatalogPagination";
import { MediaAudioCard } from "@/components/media/MediaAudioCard";
import { MediaVideoCard } from "@/components/media/MediaVideoCard";
import { MediaSection } from "@/components/media/MediaSection";
import { MediaTabs } from "@/components/media/MediaTabs";
import { SeoContentBlockSlot } from "@/components/seo/SeoContentBlockSlot";
import { AudioCompanionAdSlot } from "@/src/components/audio/AudioCompanionAdSlot";
import { MediaPageSkeleton } from "@/components/ui/navigation-skeletons";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { metadataForStaticRoute } from "@/lib/seo/public-page-metadata";
import { getAudioPolicySettings } from "@/lib/settings/audio-policy-settings";
import {
  buildMediaHubHref,
  hasActiveMediaFilters,
  parseMediaHubParams
} from "@/lib/media/media-query-params";
import {
  enrichAudioCovers,
  getMediaHubAudioPage,
  getMediaHubStats,
  getMediaHubVideoPage
} from "@/lib/media/media-hub-data";
import { buildStoryAudioQueue } from "@/src/lib/audio/audio-queue";
import { getContinueAudioItemIdsForProfile } from "@/src/lib/audio/continue-listening";
import { canShowAdsOnAudio } from "@/src/lib/audio/audio-policy";
import { createClient } from "@/lib/data/server";
import { resolveStoryCoverUrl } from "@/lib/stories/resolve-story-cover-url";

type MediaPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const EMPTY_MEDIA_STATS = {
  audioCount: 0,
  videoCount: 0,
  storiesWithMediaCount: 0
};

function logMediaPageError(scope: string, error: unknown) {
  console.warn(`[media_page] ${scope} failed`, error);
}

async function loadMediaStatsSafely() {
  try {
    return await getMediaHubStats();
  } catch (error) {
    logMediaPageError("stats", error);
    return EMPTY_MEDIA_STATS;
  }
}

async function loadAudioPageSafely(params: ReturnType<typeof parseMediaHubParams>) {
  try {
    return await getMediaHubAudioPage(params);
  } catch (error) {
    logMediaPageError("audio", error);
    return {
      items: [],
      featuredItems: [],
      totalCount: 0,
      page: params.page,
      pageSize: params.pageSize
    };
  }
}

async function loadVideoPageSafely(params: ReturnType<typeof parseMediaHubParams>) {
  try {
    return await getMediaHubVideoPage(params);
  } catch (error) {
    logMediaPageError("video", error);
    return {
      items: [],
      featuredItems: [],
      page: params.page,
      pageSize: params.pageSize,
      totalCount: 0,
      totalPages: 1
    };
  }
}

async function enrichAudioCoversSafely(
  items: Awaited<ReturnType<typeof getMediaHubAudioPage>>["items"],
  scope: string
) {
  try {
    return await enrichAudioCovers(items);
  } catch (error) {
    logMediaPageError(scope, error);
    return items;
  }
}

function mediaSearchKey(params: Record<string, string | string[] | undefined>) {
  return Object.entries(params)
    .flatMap(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map((item) => [key, item] as const);
      }
      return typeof value === "string" && value.length > 0 ? ([[key, value]] as const) : [];
    })
    .sort(([aKey, aValue], [bKey, bValue]) =>
      aKey === bKey ? aValue.localeCompare(bValue) : aKey.localeCompare(bKey)
    )
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

function MediaPanelSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-24 animate-pulse rounded-2xl bg-white/10" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="h-48 animate-pulse rounded-2xl bg-white/10" key={index} />
        ))}
      </div>
    </div>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return metadataForStaticRoute({
    path: "/media",
    pageType: "media",
    targetType: "media",
    fallbackTitle: "Media truyện: Audio và Video chuyển thể | ChapMee",
    fallbackDescription:
      "Nghe audio truyện và xem video chuyển thể từ các tác phẩm trên ChapMee."
  });
}

function buildPageHref(params: ReturnType<typeof parseMediaHubParams>, page: number) {
  return buildMediaHubHref(params.tab, { ...params, page });
}

async function MediaTabPanel({
  searchParams
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const params = parseMediaHubParams(searchParams);
  const hasFilters = hasActiveMediaFilters(params);
  const auth = await getCurrentUser();

  if (params.tab === "audio") {
    const [pageData, settings] = await Promise.all([
      loadAudioPageSafely(params),
      getAudioPolicySettings()
    ]);
    let items = await enrichAudioCoversSafely(pageData.items, "audio_covers");
    let featuredItems = await enrichAudioCoversSafely(pageData.featuredItems, "featured_audio_covers");

    const continueAudioItemIds = auth.user
      ? await getContinueAudioItemIdsForProfile(auth.user.id)
      : new Set<string>();

    const totalPages = Math.max(1, Math.ceil(pageData.totalCount / pageData.pageSize));
    const prevPage = Math.max(1, pageData.page - 1);
    const nextPage = Math.min(totalPages, pageData.page + 1);

    const queueByStoryId = new Map<string, Awaited<ReturnType<typeof buildStoryAudioQueue>>>();
    for (const item of [...featuredItems, ...items]) {
      if (!queueByStoryId.has(item.story_id)) {
        const queue = await buildStoryAudioQueue(item.story_id).catch(() => []);
        queueByStoryId.set(item.story_id, queue);
      }
    }

    const canShowLandingAds = items.some((item) =>
      canShowAdsOnAudio(
        { id: item.story_id, content_origin: item.story_content_origin, rights_status: null },
        {
          audio_source_type: item.audio_source_type,
          ads_policy: item.ads_policy,
          rights_status: item.rights_status
        },
        settings
      )
    );

    const mainIds = new Set(items.map((i) => i.id));
    const spotlight = featuredItems.filter((i) => !mainIds.has(i.id));

    return (
      <div className="space-y-6">
        <Suspense fallback={null}>
          <MediaCatalogFilterSection params={params} />
        </Suspense>

        <MediaResultsToolbar
          page={pageData.page}
          pageSize={pageData.pageSize}
          tab="audio"
          totalCount={pageData.totalCount}
          totalPages={totalPages}
        />

        {spotlight.length > 0 && params.page === 1 ? (
          <MediaSection
            description="Tiếp tục hoặc audio vừa cập nhật"
            title={continueAudioItemIds.size > 0 ? "Đang được nghe" : "Nổi bật"}
          >
            <MediaGrid variant="audio">
              {spotlight.map((item) => (
                <MediaAudioCard
                  isContinueItem={continueAudioItemIds.has(item.id)}
                  item={item}
                  key={`featured-${item.id}`}
                  queue={queueByStoryId.get(item.story_id) ?? []}
                />
              ))}
            </MediaGrid>
          </MediaSection>
        ) : null}

        {items.length === 0 ? (
          <MediaEmptyState hasFilters={hasFilters} params={params} />
        ) : (
          <MediaSection title={params.page === 1 && spotlight.length > 0 ? "Tất cả audio" : "Audio truyện"}>
            <MediaGrid variant="audio">
              {items.map((item) => (
                <MediaAudioCard
                  isContinueItem={continueAudioItemIds.has(item.id)}
                  item={item}
                  key={item.id}
                  queue={queueByStoryId.get(item.story_id) ?? []}
                />
              ))}
            </MediaGrid>
          </MediaSection>
        )}

        <AudioCompanionAdSlot canShowAds={canShowLandingAds} placementKey="media_audio_feed" />

        <CatalogPagination
          buildPageHref={(page) => buildPageHref(params, page)}
          currentPage={pageData.page}
          itemLabel="media"
          nextHref={buildPageHref(params, nextPage)}
          pageSize={pageData.pageSize}
          prevHref={buildPageHref(params, prevPage)}
          totalCount={pageData.totalCount}
          totalPages={totalPages}
        />

      </div>
    );
  }

  const pageData = await loadVideoPageSafely(params);
  const totalPages = pageData.totalPages;
  const prevPage = Math.max(1, pageData.page - 1);
  const nextPage = Math.min(totalPages, pageData.page + 1);

  const storyIds = [...new Set(pageData.items.map((f) => f.story_id))];
  let storyMeta = new Map<string, { cover: string | null; origin: string | null }>();
  try {
    const db = await createClient();
    const { data: storyRows } =
      storyIds.length > 0
        ? await db
            .from("stories")
            .select("id, cover_url, content_origin")
            .in("id", storyIds)
        : { data: [] };
    storyMeta = new Map(
      (storyRows ?? []).map((row) => [
        String(row.id),
        {
          cover: resolveStoryCoverUrl(row.cover_url as string | null),
          origin: row.content_origin as string | null
        }
      ])
    );
  } catch (error) {
    logMediaPageError("story_meta", error);
  }

  const mainIds = new Set(pageData.items.map((i) => i.id));
  const spotlight = pageData.featuredItems.filter((i) => !mainIds.has(i.id));

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <MediaCatalogFilterSection params={params} />
      </Suspense>

      <MediaResultsToolbar
        page={pageData.page}
        pageSize={pageData.pageSize}
        tab="video"
        totalCount={pageData.totalCount}
        totalPages={totalPages}
      />

      {spotlight.length > 0 && params.page === 1 ? (
        <MediaSection description="Video chuyển thể mới trên ChapMee" title="Nổi bật">
          <MediaGrid variant="video">
            {spotlight.map((film) => {
              const meta = storyMeta.get(film.story_id);
              return (
                <MediaVideoCard
                  film={film}
                  key={`featured-${film.id}`}
                  storyContentOrigin={meta?.origin}
                  storyCoverUrl={meta?.cover}
                />
              );
            })}
          </MediaGrid>
        </MediaSection>
      ) : null}

      {pageData.items.length === 0 ? (
        <MediaEmptyState hasFilters={hasFilters} params={params} />
      ) : (
        <MediaSection
          title={params.page === 1 && spotlight.length > 0 ? "Tất cả video" : "Video chuyển thể"}
        >
          <MediaGrid variant="video">
            {pageData.items.map((film) => {
              const meta = storyMeta.get(film.story_id);
              return (
                <MediaVideoCard
                  film={film}
                  key={film.id}
                  storyContentOrigin={meta?.origin}
                  storyCoverUrl={meta?.cover}
                />
              );
            })}
          </MediaGrid>
        </MediaSection>
      )}

      <CatalogPagination
        buildPageHref={(page) => buildPageHref(params, page)}
        currentPage={pageData.page}
        itemLabel="media"
        nextHref={buildPageHref(params, nextPage)}
        pageSize={pageData.pageSize}
        prevHref={buildPageHref(params, prevPage)}
        totalCount={pageData.totalCount}
        totalPages={totalPages}
      />

    </div>
  );
}

export default async function MediaPage(props: MediaPageProps) {
  const raw = await props.searchParams;
  const params = parseMediaHubParams(raw);
  const activeTab = params.tab;
  const [stats] = await Promise.all([loadMediaStatsSafely()]);

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col pb-6 md:min-h-[calc(100dvh-8rem)]">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-3 px-0 sm:gap-4">
        <MediaHero activeTab={activeTab} stats={stats} />

        <Suspense fallback={<MediaPageSkeleton />}>
          <MediaTabs activeTab={activeTab} />
        </Suspense>

        <Suspense fallback={<MediaPanelSkeleton />} key={mediaSearchKey(raw)}>
          <MediaTabPanel searchParams={raw} />
        </Suspense>

        {!hasActiveMediaFilters(params) && params.page <= 1 ? (
          <SeoContentBlockSlot locale="vi" pageType="media" routePath="/media" />
        ) : null}
      </div>
    </div>
  );
}
