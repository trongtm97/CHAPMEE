import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Comments } from "@/components/comments/Comments";
import { MatureContentWarning } from "@/components/moderation/MatureContentWarning";
import { PaidChapterGate } from "@/components/monetization/PaidChapterGate";
import { EarlyAccessGate } from "@/components/monetization/EarlyAccessGate";
import { SupportButton } from "@/components/monetization/SupportButton";
import { PollCard } from "@/components/polls/PollCard";
import { DesktopEpisodeSidebar } from "@/components/reader/DesktopEpisodeSidebar";
import { DesktopReaderLayout } from "@/components/reader/DesktopReaderLayout";
import { ReaderPage } from "@/components/reader/ReaderPage";
import { ErrorState } from "@/components/ui";
import { trackServerEvent } from "@/lib/analytics/trackServerEvent";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getComments } from "@/lib/comments/getComments";
import { getEpisodeReaderData } from "@/lib/episodes/getEpisodeReaderData";
import { getEarlyAccessReaderState } from "@/lib/monetization/early-access";
import { getPaidChapterReaderState } from "@/lib/monetization/paid-chapters";
import { getRewardedAdsAvailability } from "@/lib/monetization/rewarded-ads";
import { persistReadingProgress } from "@/lib/reading/persistReadingProgress";
import { buildPublicEpisodeMetadata } from "@/lib/seo/build-metadata";
import { buildCanonicalUrl, buildEpisodeDescription } from "@/lib/seo/metadata";
import { buildBreadcrumbJsonLd, buildEpisodeArticleJsonLd } from "@/lib/seo/structured-data";
import { getStoryUserState } from "@/lib/stories/getStoryUserState";
import { getStoryBySlug } from "@/lib/stories/getStoryBySlug";
import { getChapterReactionView } from "@/lib/supabase/reactions";

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
  const { episodeNumber, slug } = await params;
  const parsedEpisodeNumber = Number(episodeNumber);
  const { data } = await getEpisodeReaderData(slug, parsedEpisodeNumber);

  if (!data) {
    return {
      title: "Không tìm thấy chương",
      description: "Chương này không khả dụng hoặc chưa được xuất bản.",
      robots: { index: false, follow: false }
    };
  }

  return buildPublicEpisodeMetadata({
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
  const { episodeNumber, slug } = await params;
  const parsedEpisodeNumber = Number(episodeNumber);
  const {
    data,
    error,
    notFound: isNotFound
  } = await getEpisodeReaderData(slug, parsedEpisodeNumber);

  if (isNotFound) {
    notFound();
  }

  if (!data) {
    return (
      <section className="space-y-5">
        <Link className="text-sm font-semibold text-cyan-300" href="/">
          Về trang chủ
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
    content: data.episode.content
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

  const analyticsContext = {
    creatorId: data.story.creatorId,
    episodeId: data.episode.id,
    episodeNumber: data.episode.episodeNumber,
    slug: data.story.slug,
    storyId: data.story.id,
    wordCount: data.episode.wordCount
  };

  const { story: storyDetail } = await getStoryBySlug(data.story.slug);
  const episodes = storyDetail?.episodes ?? [];
  const episodeDescription = buildEpisodeDescription(data);
  const returnTo = `/stories/${data.story.slug}/episodes/${data.episode.episodeNumber}`;

  const [reaction, commentsResult] = await Promise.all([
    getChapterReactionView(data.episode.id, user?.id ?? null),
    getComments({ episodeId: data.episode.id, storyId: data.story.id })
  ]);

  const readerContent = isLockedByPaidChapter ? paidState.previewContent : data.episode.content;
  const readerData = {
    ...data,
    episode: {
      ...data.episode,
      content: readerContent
    }
  };

  return (
    <>
      <DesktopReaderLayout
        leftSidebar={
          storyDetail && episodes.length > 0 ? (
            <DesktopEpisodeSidebar
              currentEpisodeNumber={data.episode.episodeNumber}
              story={storyDetail}
            />
          ) : null
        }
        centerContent={
          <MatureContentWarning
            ageRating={data.story.ageRating}
            sensitiveFlags={data.story.sensitiveFlags}
            storyTitle={data.story.title}
          >
            <ReaderPage
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
                </>
              }
              analyticsContext={analyticsContext}
              comments={commentsResult.comments}
              commentsUserId={commentsResult.currentUserId}
              data={readerData}
              episodeDescription={episodeDescription}
              episodes={episodes}
              lockedContent={isLocked}
              reaction={reaction}
              showComments={!isLocked}
              showReactions={!isLocked}
              userState={userState}
            />
          </MatureContentWarning>
        }
        rightSidebar={
          !isLocked ? (
            <>
              <SupportButton
                chapterId={data.episode.id}
                storyId={data.story.id}
                toCreatorUserId={data.story.creatorUserId}
              />
              <Comments returnTo={returnTo} target={{ episodeId: data.episode.id, storyId: data.story.id }} />
            </>
          ) : null
        }
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildEpisodeArticleJsonLd(data)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildBreadcrumbJsonLd([
              { name: "Trang chủ", url: buildCanonicalUrl("/") ?? "/" },
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
