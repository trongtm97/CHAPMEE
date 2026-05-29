import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LazySwipeFeed } from "@/components/swipe/LazySwipeFeed";
import { SwipeShell } from "@/components/swipe/SwipeShell";
import { ContinueReadingSection } from "@/components/home/ContinueReadingSection";
import { FeaturedCreatorsSection } from "@/components/home/FeaturedCreatorsSection";
import { FeaturedStorySection } from "@/components/home/FeaturedStorySection";
import { ForYouSection } from "@/components/home/ForYouSection";
import { HomeHeader } from "@/components/home/HomeHeader";
import { NewChaptersSection } from "@/components/home/NewChaptersSection";
import { TrendingSection } from "@/components/home/TrendingSection";
import { LifecycleNudge } from "@/components/lifecycle/LifecycleNudge";
import { ErrorState, LoadingState } from "@/components/ui";
import {
  dismissLifecycleNudgeAction,
  markLifecycleNudgeShownAction
} from "@/lib/actions/lifecycle";
import { BRAND_NAME } from "@/lib/brand/constants";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getProductConfigFast } from "@/lib/config/product-config";
import { getLifecycleNudgeForUser } from "@/lib/supabase/lifecycle";
import { getHomeStories } from "@/lib/stories/getHomeStories";
import { getSwipeItems } from "@/lib/swipe/getSwipeItems";

export const dynamic = "force-dynamic";

async function HomeContent() {
  const { user } = await getCurrentUser();
  const productConfig = await getProductConfigFast();

  if (!user) {
    redirect("/landing");
  }

  const userAgent = (await headers()).get("user-agent") ?? "";
  const isMobileAgent =
    /android|iphone|ipod|ipad|mobile|windows phone/i.test(userAgent);

  if (
    isMobileAgent &&
    productConfig.product.swipeFirstEnabled &&
    productConfig.product.mobileDefaultTab === "swipe"
  ) {
    redirect("/swipe");
  }

  if (!isMobileAgent && productConfig.product.desktopHomeMode === "swipe_feed") {
    const { error, hasMore, items, nextOffset } = await getSwipeItems({
      limit: 12,
      offset: 0
    });

    return (
      <SwipeShell>
        {error ? <ErrorState message={error} title="Không tải được feed lướt" /> : null}
        <LazySwipeFeed
          desktopConfig={productConfig.swipe}
          initialHasMore={hasMore}
          initialItems={items}
          initialNextOffset={nextOffset}
        />
      </SwipeShell>
    );
  }

  const homeData = await getHomeStories(user.id);
  const lifecycleNudge = await getLifecycleNudgeForUser(user.id, "home");

  return (
    <div className="w-full space-y-6 sm:space-y-7">
      <div className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(34,211,238,0.12),rgba(255,255,255,0.03))] p-5">
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-cyan-200">{BRAND_NAME}</p>
        <h1 className="mt-2 text-3xl font-black tracking-normal text-white">Lướt truyện cuốn như TikTok</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-300">Đọc truyện ngắn, theo dõi tác giả, bình luận và vote hướng truyện ngay trên điện thoại.</p>
        <div className="mt-4 flex gap-3">
          <Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-4 text-sm font-black text-zinc-950" href="/swipe">Đọc ngay</Link>
          <Link className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-black text-white" href="/studio">Trở thành tác giả</Link>
        </div>
      </div>
      <HomeHeader />
      <LifecycleNudge
        nudge={lifecycleNudge}
        onDismiss={dismissLifecycleNudgeAction}
        onShown={markLifecycleNudgeShownAction}
      />

      {homeData.error ? (
        <ErrorState message={homeData.error} title="Không tải được trang chủ" />
      ) : null}

      <ContinueReadingSection items={homeData.continueReading} />
      <FeaturedStorySection story={homeData.featuredStory} />
      <ForYouSection stories={homeData.forYou} />
      <NewChaptersSection chapters={homeData.newChapters} />
      <TrendingSection stories={homeData.trending} />
      <FeaturedCreatorsSection creators={homeData.featuredCreators} />
      <footer className="space-y-3 border-t border-white/10 pt-5 text-sm text-zinc-500">
        <div className="flex flex-wrap gap-3">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/community-guidelines">Community Guidelines</Link>
          <Link href="/content-policy">Content Policy</Link>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingState label="Đang tải trang chủ..." />}>
      <HomeContent />
    </Suspense>
  );
}
