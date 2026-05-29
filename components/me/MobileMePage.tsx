"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LifecycleNudge } from "@/components/lifecycle/LifecycleNudge";
import {
  dismissLifecycleNudgeAction,
  markLifecycleNudgeShownAction
} from "@/lib/actions/lifecycle";
import { MobileBackHeader } from "@/components/me/MobileBackHeader";
import { ProfileHero } from "@/components/me/ProfileHero";
import { MeProfileCoinBalance } from "@/components/me/MeProfileCoinBalance";
import { ProfileQuickActions } from "@/components/me/ProfileQuickActions";
import { ProfileRefreshAlert } from "@/components/me/ProfileRefreshAlert";
import { ProfileTabs } from "@/components/me/ProfileTabs";
import { buildReaderProfileSharePayload } from "@/lib/share/profileShare";
import {
  ME_READING_SECTION_IDS,
  parseMeReadingSection
} from "@/lib/me/profileQuickActions";
import { AchievementsTab } from "@/components/me/tabs/AchievementsTab";
import { ActivityTab } from "@/components/me/tabs/ActivityTab";
import { OverviewTab } from "@/components/me/tabs/OverviewTab";
import { ReadingTab } from "@/components/me/tabs/ReadingTab";
import { WritingTab } from "@/components/me/tabs/WritingTab";
import type { MePageData, MePageTab } from "@/types/me-page";

type MobileMePageProps = {
  data: MePageData;
};

const tabTitles: Record<Exclude<MePageTab, "overview">, string> = {
  reading: "Đọc",
  writing: "Viết",
  activity: "Hoạt động",
  achievements: "Thành tích"
};

const readingSectionTitles: Record<string, string> = {
  continue: "Đọc tiếp",
  saved: "Đã lưu",
  collections: "Tủ truyện",
  groups: "Nhóm theo dõi"
};

function getTabTitle(tab: MePageTab, section: string | null) {
  if (tab === "reading" && section && readingSectionTitles[section]) {
    return readingSectionTitles[section];
  }
  return tabTitles[tab as Exclude<MePageTab, "overview">];
}

function parseTab(value: string | null): MePageTab {
  if (
    value === "reading" ||
    value === "writing" ||
    value === "activity" ||
    value === "achievements"
  ) {
    return value;
  }
  return "overview";
}

export function MobileMePage({ data }: MobileMePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<MePageTab>("overview");

  useEffect(() => {
    setActiveTab(parseTab(searchParams.get("tab")));
  }, [searchParams]);

  useEffect(() => {
    const section = parseMeReadingSection(searchParams.get("section"));
    if (!section || activeTab !== "reading") {
      return;
    }

    const sectionId = ME_READING_SECTION_IDS[section];
    const timer = window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 180);

    return () => window.clearTimeout(timer);
  }, [activeTab, searchParams]);

  function handleTabChange(tab: MePageTab) {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "overview") {
      params.delete("tab");
      params.delete("section");
    } else {
      params.set("tab", tab);
      params.delete("section");
    }
    const query = params.toString();
    router.replace(query ? `/me?${query}` : "/me", { scroll: false });
  }

  const showTabHeader = activeTab !== "overview";
  const activeSection = searchParams.get("section");

  return (
    <section className="space-y-3 overflow-x-hidden pb-2 lg:hidden">
      {showTabHeader ? (
        <MobileBackHeader
          backLabel="Tôi"
          fallbackHref="/me"
          onBack={() => handleTabChange("overview")}
          title={getTabTitle(activeTab, activeSection)}
        />
      ) : (
        <>
          <ProfileHero
            avatarUrl={data.user.avatarUrl}
            bio={data.user.bio}
            displayName={data.user.displayName}
            editHref="/me/settings"
            handle={data.user.handle}
            isCreator={data.permissionFlags.canOpenStudio}
            roleBadges={data.profileBadges.filter(
              (badge) => badge.label !== "VIP" && !badge.label.includes("đã lưu")
            )}
            shareText={
              buildReaderProfileSharePayload({
                avatarUrl: data.user.avatarUrl,
                badges: data.readerProfile.badges,
                bio: data.user.bio,
                earlyFanStories: data.readerProfile.earlyFanStories,
                stats: data.stats,
                title: data.user.displayName,
                topFanHighlights: data.readerProfile.topFanHighlights,
                url: data.shareUrl
              }).text
            }
            shareUrl={data.shareUrl}
            stats={data.stats}
          />

          <ProfileRefreshAlert message={data.refreshError} severity="soft" />

          {data.accountNotice ? (
            <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {data.accountNotice}
            </p>
          ) : null}

          <MeProfileCoinBalance showCoinWallet={data.monetization.showCoinWallet}>
            {(coinBalance) => (
              <ProfileQuickActions
                coinBalance={coinBalance}
                collectionsCount={data.collections.length}
                groupsCount={data.communityGroupsCount}
                isCreator={data.permissionFlags.canOpenStudio}
                readingCount={data.currentlyReading.length}
                savedCount={data.readerProfile.metrics.savedStoriesCount}
                showCoinWallet={data.monetization.showCoinWallet}
              />
            )}
          </MeProfileCoinBalance>

          <ProfileTabs activeTab={activeTab} onChange={handleTabChange} />

          <LifecycleNudge
            nudge={data.lifecycleNudge}
            onDismiss={dismissLifecycleNudgeAction}
            onShown={markLifecycleNudgeShownAction}
          />
        </>
      )}

      <div className="min-w-0 pt-1">
        {activeTab === "overview" ? <OverviewTab data={data} /> : null}
        {activeTab === "reading" ? <ReadingTab data={data} /> : null}
        {activeTab === "writing" ? <WritingTab data={data} /> : null}
        {activeTab === "activity" ? <ActivityTab data={data} /> : null}
        {activeTab === "achievements" ? <AchievementsTab data={data} /> : null}
      </div>
    </section>
  );
}
