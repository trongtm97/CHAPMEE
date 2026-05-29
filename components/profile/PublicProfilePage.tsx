import { Suspense } from "react";
import Link from "next/link";
import { PublicProfileHeader } from "@/components/profile/PublicProfileHeader";
import { PublicProfileTabs } from "@/components/profile/PublicProfileTabs";
import { PublicCollectionsTab } from "@/components/profile/PublicCollectionsTab";
import { PublicActivitiesTab } from "@/components/profile/PublicActivitiesTab";
import { PublicCommentsTab } from "@/components/profile/PublicCommentsTab";
import { PublicBadgesTab } from "@/components/profile/PublicBadgesTab";
import { PublicWorksTab } from "@/components/profile/PublicWorksTab";
import { ProfileFollowToast } from "@/components/profile/ProfileFollowToast";
import { EmptyState } from "@/components/ui";
import type { PublicProfilePageData, PublicProfileTab } from "@/types/public-profile";

type PublicProfilePageProps = {
  data: PublicProfilePageData;
  activeTab: PublicProfileTab;
  page: number;
};

export function PublicProfilePage({ activeTab, data, page }: PublicProfilePageProps) {
  const resolvedTab = data.visibleTabs.includes(activeTab)
    ? activeTab
    : (data.visibleTabs[0] ?? "collections");

  return (
    <div className="space-y-4 pb-8">
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

      <PublicProfileHeader data={data} />

      {data.visibleTabs.length ? (
        <>
          <PublicProfileTabs
            activeTab={resolvedTab}
            username={data.user.username}
            visibleTabs={data.visibleTabs}
          />
          <section>
            {resolvedTab === "collections" ? (
              <PublicCollectionsTab
                collections={data.collections}
                page={page}
                total={data.collectionsTotal}
                username={data.user.username}
              />
            ) : null}
            {resolvedTab === "activity" ? (
              <PublicActivitiesTab
                activities={data.activities}
                page={page}
                total={data.activitiesTotal}
                username={data.user.username}
              />
            ) : null}
            {resolvedTab === "comments" ? (
              <PublicCommentsTab
                comments={data.comments}
                page={page}
                total={data.commentsTotal}
                username={data.user.username}
              />
            ) : null}
            {resolvedTab === "badges" ? (
              <PublicBadgesTab
                badgeItems={data.badgeItems}
                showBadges={data.privacy.showBadges}
              />
            ) : null}
            {resolvedTab === "works" ? (
              <PublicWorksTab
                page={page}
                total={data.worksTotal}
                username={data.user.username}
                works={data.works}
              />
            ) : null}
          </section>
        </>
      ) : (
        <EmptyState
          description="Người dùng này đã tắt mọi mục hiển thị công khai."
          title="Hồ sơ riêng tư"
        />
      )}
    </div>
  );
}
