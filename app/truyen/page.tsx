import type { Metadata } from "next";
import { Suspense } from "react";

import { StoryCatalogPage } from "@/components/stories/StoryCatalogPage";
import { SeoContentBlockSlot } from "@/components/seo/SeoContentBlockSlot";

import { ErrorState } from "@/components/ui";
import { TruyenPageSkeleton } from "@/components/ui/navigation-skeletons";

import { catalogHasDeepFilters, parseCatalogSearchParams } from "@/lib/discovery/catalog-url";

import { getCatalogFilterOptionsCached } from "@/lib/discovery/catalog-filter-options-cached";

import { getPublicStoriesCatalogCached } from "@/lib/stories/getPublicStoriesCatalogCached";

import { clampPage, clampPageSize, DEFAULT_CATALOG_PAGE_SIZE } from "@/lib/stories/story-catalog-query";

import { metadataForStaticRoute } from "@/lib/seo/public-page-metadata";

import { getAudioPolicySettings } from "@/lib/settings/audio-policy-settings";



export const revalidate = 60;



type StoriesIndexPageProps = {

  searchParams: Promise<Record<string, string | undefined>>;

};

function catalogSearchKey(params: Record<string, string | undefined>) {
  return Object.entries(params)
    .filter(([, value]) => typeof value === "string" && value.length > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}



export async function generateMetadata({

  searchParams

}: StoriesIndexPageProps): Promise<Metadata> {

  const params = await searchParams;

  const filters = parseCatalogSearchParams(params);

  const deepFilters = catalogHasDeepFilters(filters);

  return metadataForStaticRoute({
    path: "/truyen",
    pageType: "story_catalog",
    fallbackTitle: "Danh mục truyện ChapMee",
    fallbackDescription:
      "Tìm truyện sáng tác, truyện dịch, truyện hoàn thành, truyện có audio và các thể loại nổi bật trên ChapMee.",
    indexableOverride: deepFilters ? false : null,
    followOverride: true
  });
}



async function StoriesCatalogContent({
  params
}: {
  params: Record<string, string | undefined>;
}) {


  const filters = parseCatalogSearchParams(params);

  const page = clampPage(filters.page ?? 1);

  const pageSize = filters.pageSize ? clampPageSize(filters.pageSize) : DEFAULT_CATALOG_PAGE_SIZE;



  try {

    const [data, filterOptions, audioPolicy] = await Promise.all([

      getPublicStoriesCatalogCached({

        ...filters,

        page,

        pageSize

      }),

      getCatalogFilterOptionsCached(),

      getAudioPolicySettings()

    ]);



    const deepFilters = catalogHasDeepFilters(filters);



    return (

      <>

        <StoryCatalogPage

          {...data}

          audioBadgeDisplay={{

            showAudioBadge: audioPolicy.show_audio_badge_on_story_cards,

            showContinuousBadge: audioPolicy.show_continuous_playback_badge

          }}

          filterOptions={filterOptions}

        />

        {!deepFilters ? (
          <SeoContentBlockSlot locale="vi" pageType="story_catalog" routePath="/truyen" />
        ) : null}

      </>

    );

  } catch (error) {

    const message =

      error instanceof Error ? error.message : "Không thể tải danh mục truyện.";

    return (

      <section className="mx-auto max-w-lg px-4 py-10">

        <ErrorState

          message={message}

          title="Không tải được danh mục truyện"

          variant="danger"

        />

      </section>

    );

  }

}

export default async function StoriesIndexPage({ searchParams }: StoriesIndexPageProps) {
  const params = await searchParams;

  return (
    <Suspense fallback={<TruyenPageSkeleton />} key={catalogSearchKey(params)}>
      <StoriesCatalogContent params={params} />
    </Suspense>
  );
}


