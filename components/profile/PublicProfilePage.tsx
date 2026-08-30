import { Suspense } from "react";
import Link from "next/link";
import { PublicProfileHero } from "@/components/profile/PublicProfileHero";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { ProfileStoryList } from "@/components/profile/ProfileStoryList";
import { ProfileStorySort } from "@/components/profile/ProfileStorySort";
import { ProfileAchievements } from "@/components/profile/ProfileAchievements";
import { ProfileTopFans } from "@/components/profile/ProfileTopFans";
import { ProfileTopSupporters } from "@/components/profile/ProfileTopSupporters";
import { ProfileCommunityTab } from "@/components/profile/ProfileCommunityTab";
import { ProfileReelsTab } from "@/components/profile/ProfileReelsTab";
import { PublicProfileAboutTab } from "@/components/profile/PublicProfileAboutTab";
import { ProfileFollowToast } from "@/components/profile/ProfileFollowToast";
import { ProfileEmptyState } from "@/components/profile/ProfileEmptyState";
import type {
  PublicProfilePageData,
  PublicProfileTab,
  PublicWorksSort
} from "@/types/public-profile";

type PublicProfilePageProps = {
  data: PublicProfilePageData;
  activeTab: PublicProfileTab;
  page: number;
  worksSort: PublicWorksSort;
};

export function PublicProfilePage({
  activeTab,
  data,
  page,
  worksSort
}: PublicProfilePageProps) {
  const resolvedTab = data.visibleTabs.includes(activeTab)
    ? activeTab
    : (data.visibleTabs[0] ?? "about");

  const showCreatorSidebar =
    data.creator &&
    (data.creator.showTopFansSection || data.creator.showSupportersSection);

  const achievements = data.creator?.achievements ?? data.readerAchievements;
  const milestones = data.creator?.milestones ?? [];
  const isOwner = data.viewer.isOwner;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 pb-6 lg:max-w-5xl lg:pb-10">
      <Suspense fallback={null}>
        <ProfileFollowToast />
      </Suspense>

      {data.viewer.isOwner ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-cyan-300/15 bg-cyan-300/5 px-3 py-2 text-xs text-cyan-100">
          <span>Đây là hồ sơ công khai của bạn.</span>
          <Link className="font-semibold underline" href="/me/settings/privacy">
            Cài đặt hiển thị
          </Link>
        </div>
      ) : null}

      <PublicProfileHero data={data} />

      {data.visibleTabs.length ? (
        <>
          <ProfileTabs
            activeTab={resolvedTab}
            username={data.user.username}
            visibleTabs={data.visibleTabs}
          />

          <div className={showCreatorSidebar ? "lg:grid lg:grid-cols-[1fr_280px] lg:gap-6" : ""}>
            <section className="min-w-0 space-y-3">
              {resolvedTab === "stories" ? (
                <>
                  <ProfileStorySort
                    activeSort={worksSort}
                    page={page}
                    username={data.user.username}
                  />
                  <ProfileStoryList
                    isOwner={data.viewer.isOwner}
                    page={page}
                    sort={worksSort}
                    total={data.worksTotal}
                    username={data.user.username}
                    works={data.works}
                  />
                  {showCreatorSidebar ? (
                    <div className="space-y-5 border-t border-white/8 pt-4 lg:hidden">
                      {data.creator?.showSupportersSection ? (
                        <ProfileTopSupporters items={data.creator.supporters} />
                      ) : null}
                      {data.creator?.showTopFansSection ? (
                        <ProfileTopFans items={data.creator.topFans} />
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : null}

              {resolvedTab === "achievements" ? (
                <ProfileAchievements
                  achievements={achievements}
                  badgeItems={data.badgeItems}
                  isOwner={isOwner}
                  milestones={milestones}
                />
              ) : null}

              {resolvedTab === "community" ? (
                <ProfileCommunityTab
                  page={page}
                  posts={data.communityPosts}
                  total={data.communityPostsTotal}
                  username={data.user.username}
                />
              ) : null}

              {resolvedTab === "reels" ? (
                <ProfileReelsTab
                  page={page}
                  reels={data.reels}
                  total={data.reelsTotal}
                  username={data.user.username}
                />
              ) : null}

              {resolvedTab === "about" ? (
                <PublicProfileAboutTab data={data} page={page} />
              ) : null}
            </section>

            {showCreatorSidebar && resolvedTab === "stories" ? (
              <aside className="hidden space-y-5 lg:block">
                {data.creator?.showSupportersSection ? (
                  <ProfileTopSupporters items={data.creator.supporters} />
                ) : null}
                {data.creator?.showTopFansSection ? (
                  <ProfileTopFans items={data.creator.topFans} />
                ) : null}
              </aside>
            ) : null}
          </div>
        </>
      ) : (
        <ProfileEmptyState
          description="Người dùng này đã tắt mọi mục hiển thị công khai."
          title="Hồ sơ riêng tư"
        />
      )}
    </div>
  );
}
