import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SponsoredChapterEndCta } from "@/components/campaigns/SponsoredChapterEndCta";
import { MatureContentWarning } from "@/components/moderation/MatureContentWarning";
import { PaidChapterGate } from "@/components/monetization/PaidChapterGate";
import { EarlyAccessGate } from "@/components/monetization/EarlyAccessGate";
import { SupportButton } from "@/components/monetization/SupportButton";
import { PollCard } from "@/components/polls/PollCard";
import { ReaderPage } from "@/components/reader/ReaderPage";
import { ErrorState } from "@/components/ui";
import { trackServerEvent } from "@/lib/analytics/trackServerEvent";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getComments } from "@/lib/comments/getComments";
import { hydrateEpisodeReaderBody } from "@/lib/chapters/hydrate-episode-reader-body";
import { resolveEpisodeStorageType } from "@/lib/chapters/episode-content-row";
import { getEpisodeReaderData } from "@/lib/episodes/getEpisodeReaderData";
import { getEarlyAccessReaderState } from "@/lib/monetization/early-access";
import { getPaidChapterReaderState } from "@/lib/monetization/paid-chapters";
import { getRewardedAdsAvailability } from "@/lib/monetization/rewarded-ads";
import { getStoryTaxonomyTrackingContext } from "@/lib/taxonomy-analytics/story-tracking-context";
import { persistReadingProgress } from "@/lib/reading/persistReadingProgress";
import { buildPublicEpisodeMetadata } from "@/lib/seo/build-metadata";
import { buildCanonicalUrl, buildEpisodeDescription } from "@/lib/seo/metadata";
import { buildBreadcrumbJsonLd, buildEpisodeArticleJsonLd } from "@/lib/seo/structured-data";
import { getStoryUserState } from "@/lib/stories/getStoryUserState";
import { getStoryBySlug } from "@/lib/stories/getStoryBySlug";
import { getStoryChapters } from "@/lib/stories/get-story-chapters";
import { getStoryReadingProgress } from "@/lib/stories/get-story-reading-progress";
import { rangeForChapterNumber } from "@/lib/stories/chapter-ranges";
import { isStandaloneStory } from "@/lib/stories/story-structure";
import { getStoryUrl } from "@/lib/seo/canonical";
import { loadChapterEndCampaign } from "@/lib/campaigns/load-public-campaigns";
import { countReaderContentUnits } from "@/lib/ads/count-reader-content-units";
import { getChapterReactions } from "@/lib/reactions/chapter-reactions";
import { getInlineCommentCounts } from "@/lib/inline-comments/inline-comments";
import { permanentRedirect } from "next/navigation";
import { tryRedirectFromLookupTable } from "@/lib/urls/canonical";
import { getChapterUrl } from "@/lib/seo/canonical";
import { parsePublicSegment } from "@/lib/urls/parse";
import { resolveChapterFromSegments } from "@/lib/urls/resolve-chapter";
import { getAudioPolicySettings } from "@/lib/settings/audio-policy-settings";
import { canShowStoryAudioCTAOnChapterReader } from "@/src/lib/audio/audio-policy";
import { computeStoryAudioAdsAllowed, getPublicStoryAudioData } from "@/src/lib/audio/public-audio";

type EpisodePageProps = {
  params: Promise<{
    slug: string;
    episodeNumber: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params
}: EpisodePageProps): Promise<Metadata> {
  const { episodeNumber: chapterSegment, slug: storySegment } = await params;
  const resolved = await resolveChapterFromSegments(storySegment, chapterSegment);
  const storySlug = resolved?.story.slug ?? storySegment;
  const episodeNumber =
    resolved?.chapter.episode_number ?? Number(chapterSegment);
  const { data } = await getEpisodeReaderData(storySlug, episodeNumber);

  if (!data) {
    return {
      title: "Không tìm thấy chương",
      description: "Chương này không khả dụng hoặc chưa được xuất bản.",
      robots: { index: false, follow: false }
    };
  }

  return await buildPublicEpisodeMetadata({
    ...data,
    episodeStatus: data.episode.status,
    seoDescription: data.episode.seoDescription,
    seoKeywords: data.episode.seoKeywords,
    seoTitle: data.episode.seoTitle,
    storyStatus: data.story.status,
    storyVisibility: data.story.visibility
  });
}

export default async function EpisodePage({ params }: EpisodePageProps) {
  const { episodeNumber: chapterSegment, slug: storySegment } = await params;
  const storyParsed = parsePublicSegment(storySegment, "story");
  const chapterParsed = parsePublicSegment(chapterSegment, "chapter");
  const legacyPath = `/stories/${storySegment}/episodes/${chapterSegment}`;

  await tryRedirectFromLookupTable(legacyPath);

  const resolved = await resolveChapterFromSegments(storySegment, chapterSegment);

  if (resolved && (!storyParsed || !chapterParsed)) {
    permanentRedirect(resolved.canonicalPath);
  }

  const parsedEpisodeNumber = Number(chapterSegment);
  const storySlug = resolved?.story.slug ?? storySegment;
  const episodeNumber = resolved?.chapter.episode_number ?? parsedEpisodeNumber;

  const { story: storyMeta } = await getStoryBySlug(storySlug);
  if (storyMeta && isStandaloneStory(storyMeta)) {
    permanentRedirect(
      getStoryUrl({ slug: storyMeta.slug, public_code: storyMeta.publicCode })
    );
  }

  const {
    data,
    episodeStorageRow,
    error,
    notFound: isNotFound
  } = await getEpisodeReaderData(storySlug, episodeNumber);

  if (isNotFound) {
    notFound();
  }

  if (!data) {
    return (
      <section className="space-y-5">
        <Link className="text-sm font-semibold text-cyan-300" href="/">
          Về Reels
        </Link>
        <h1 className="text-3xl font-bold tracking-normal">Không tải được chương</h1>
        <ErrorState message={error} title="Không tải được chương" />
      </section>
    );
  }

  const userState = await getStoryUserState(
    data.story.id,
    data.story.creatorId
  );
  const { user, profile } = await getCurrentUser();
  const paidState = await getPaidChapterReaderState({
    userId: user?.id ?? null,
    storyId: data.story.id,
    chapterId: data.episode.id,
    creatorUserId: data.story.creatorUserId,
    episodeNumber: data.episode.episodeNumber,
    content: data.episode.plainTextPreview ?? data.episode.content
  });
  const earlyAccessState = await getEarlyAccessReaderState({
    userId: user?.id ?? null,
    storyId: data.story.id,
    chapterId: data.episode.id,
    creatorUserId: data.story.creatorUserId
  });
  const rewardedAdsAvailability = await getRewardedAdsAvailability({
    userId: user?.id ?? null,
    role: profile?.role
  });
  const isLockedByEarlyAccess = earlyAccessState.locked;
  const isLockedByPaidChapter = !isLockedByEarlyAccess && paidState.locked;
  const isLocked = isLockedByEarlyAccess || isLockedByPaidChapter;

  let readerSource = data;
  if (
    !isLocked &&
    episodeStorageRow &&
    resolveEpisodeStorageType(episodeStorageRow) !== "db"
  ) {
    readerSource = await hydrateEpisodeReaderBody(data, episodeStorageRow, {
      profileId: user?.id ?? null
    });
  }

  if (paidState.locked) {
    await trackServerEvent({
      eventName: "paid_chapter_gate_viewed",
      targetType: "chapter",
      targetId: data.episode.id,
      category: "monetization",
      metadata: {
        story_id: data.story.id,
        chapter_id: data.episode.id,
        creator_user_id: data.story.creatorUserId,
        coin_price: paidState.coinPrice
      }
    });
  }
  if (isLockedByEarlyAccess) {
    await trackServerEvent({
      eventName: "early_access_gate_viewed",
      targetType: "chapter",
      targetId: data.episode.id,
      category: "monetization",
      metadata: {
        story_id: data.story.id,
        chapter_id: data.episode.id,
        creator_user_id: data.story.creatorUserId,
        coin_price: earlyAccessState.coinPrice
      }
    });
  }

  await persistReadingProgress({
    episodeId: data.episode.id,
    progressPercent: 0,
    storyId: data.story.id
  });

  const taxonomyTracking = await getStoryTaxonomyTrackingContext(data.story.id);

  const analyticsContext = {
    creatorId: data.story.creatorId,
    episodeId: data.episode.id,
    episodeNumber: data.episode.episodeNumber,
    slug: data.story.slug,
    storyId: data.story.id,
    wordCount: data.episode.wordCount,
    taxonomyTermIds: taxonomyTracking.taxonomyTermIds,
    mainGenreId: taxonomyTracking.mainGenreId,
    sourceSurface: "catalog"
  };

  const { story: storyDetail } = await getStoryBySlug(data.story.slug);
  const episodes = storyDetail?.episodes ?? [];
  const episodeCount = storyDetail?.episodeCount ?? episodes.length;
  const currentRange = rangeForChapterNumber(
    data.episode.episodeNumber,
    episodeCount || data.episode.episodeNumber
  );
  const [chaptersData, readingProgress] = await Promise.all([
    getStoryChapters({
      storyId: data.story.id,
      rangeStart: currentRange.start,
      rangeEnd: currentRange.end
    }),
    getStoryReadingProgress(data.story.id, user?.id ?? null)
  ]);
  const episodeDescription = buildEpisodeDescription(data);
  const returnTo = data.chapterHref;

  const [chapterReactions, commentsResult, chapterEndCampaign, inlineCommentCounts, audioData] = await Promise.all([
    getChapterReactions(data.episode.id, user?.id ?? null),
    getComments({ episodeId: data.episode.id, storyId: data.story.id }),
    loadChapterEndCampaign(
      { id: data.story.id, slug: data.story.slug },
      { id: data.episode.id }
    ),
    getInlineCommentCounts(data.episode.id),
    getPublicStoryAudioData(data.story.id)
  ]);

  const [canShowStoryAudioAds, audioPolicy] = await Promise.all([
    storyDetail
      ? computeStoryAudioAdsAllowed(
          {
            id: storyDetail.id,
            content_origin: storyDetail.contentOrigin,
            rights_status: storyDetail.rightsStatus
          },
          audioData.items
        )
      : Promise.resolve(false),
    getAudioPolicySettings()
  ]);
  const canShowStoryAudioCta =
    audioData.items.length > 0 &&
    canShowStoryAudioCTAOnChapterReader({ id: data.story.id }, audioPolicy);
  const continueAudioItemId = audioPolicy.show_continue_listening
    ? audioData.continueAudioItemId
    : null;

  const readerContent = isLockedByPaidChapter
    ? paidState.previewContent
    : readerSource.episode.content;
  const contentUnitCount = countReaderContentUnits({
    content: readerContent,
    structuredContent: readerSource.episode.structuredContent
  });
  const readerData = {
    ...readerSource,
    episode: {
      ...readerSource.episode,
      content: readerContent
    }
  };

  return (
    <>
      <MatureContentWarning
        ageRating={data.story.ageRating}
        sensitiveFlags={data.story.sensitiveFlags}
        storyTitle={data.story.title}
      >
        <ReaderPage
          chaptersData={chaptersData}
          contentUnitCount={contentUnitCount}
          readingProgress={readingProgress}
          supportSlot={
            !isLocked ? (
              <div className="hidden shrink-0 lg:block">
                <SupportButton
                  chapterId={data.episode.id}
                  storyId={data.story.id}
                  toCreatorUserId={data.story.creatorUserId}
                />
              </div>
            ) : null
          }
          afterContent={
            <>
              {isLockedByEarlyAccess ? (
                <EarlyAccessGate
                  chapterId={data.episode.id}
                  coinPrice={earlyAccessState.coinPrice}
                  freeAt={earlyAccessState.freeAt}
                  isLoggedIn={Boolean(user)}
                  purchaseEnabled={earlyAccessState.purchaseEnabled}
                  purchaseMode={earlyAccessState.purchaseMode}
                  remainingHours={earlyAccessState.remainingHours}
                  storyId={data.story.id}
                  walletBalance={earlyAccessState.walletBalance}
                  rewardedAdsAvailability={rewardedAdsAvailability}
                />
              ) : null}
              {isLockedByPaidChapter ? (
                <PaidChapterGate
                  chapterId={data.episode.id}
                  chapterTitle={data.episode.title}
                  coinPrice={paidState.coinPrice}
                  creatorName={data.story.creatorName}
                  isLoggedIn={Boolean(user)}
                  purchaseEnabled={paidState.purchaseEnabled}
                  purchaseMode={paidState.purchaseMode}
                  storyId={data.story.id}
                  storyTitle={data.story.title}
                  walletBalance={paidState.walletBalance}
                  rewardedAdsAvailability={rewardedAdsAvailability}
                />
              ) : null}
              {data.poll && !isLocked ? (
                <div className="mt-8">
                  <PollCard
                    authorId={data.story.creatorId}
                    loggedIn={userState.isLoggedIn}
                    poll={data.poll}
                    returnTo={returnTo}
                    storyId={data.story.id}
                  />
                </div>
              ) : null}
              {chapterEndCampaign && !isLocked ? (
                <SponsoredChapterEndCta campaign={chapterEndCampaign} />
              ) : null}
            </>
          }
          analyticsContext={analyticsContext}
          comments={commentsResult.comments}
          commentsUserId={commentsResult.currentUserId}
          data={readerData}
          episodeDescription={episodeDescription}
          episodes={episodes}
          inlineCommentCounts={inlineCommentCounts}
          lockedContent={isLocked}
          chapterReactions={chapterReactions}
          showComments={!isLocked}
          showInlineComments={!isLocked}
          showReactions={!isLocked}
          userState={userState}
          storyAudioQueue={audioData.queue}
          continueAudioItemId={continueAudioItemId}
          canShowStoryAudioAds={canShowStoryAudioAds}
          canShowStoryAudioCta={canShowStoryAudioCta}
        />
      </MatureContentWarning>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildEpisodeArticleJsonLd(data)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildBreadcrumbJsonLd([
              { name: "Reels", url: buildCanonicalUrl("/") ?? "/" },
              {
                name: data.story.title,
                url: buildCanonicalUrl(`/truyen/${data.story.slug}`) ?? `/truyen/${data.story.slug}`
              },
              {
                name: `Chương ${data.episode.episodeNumber}`,
                url:
                  buildCanonicalUrl(
                    `/truyen/${data.story.slug}/chuong/${data.episode.episodeNumber}`
                  ) ??
                  `/truyen/${data.story.slug}/chuong/${data.episode.episodeNumber}`
              }
            ])
          )
        }}
      />
    </>
  );
}
