import Link from "next/link";
import { LifecycleNudge } from "@/components/lifecycle/LifecycleNudge";
import {
  dismissLifecycleNudgeAction,
  markLifecycleNudgeShownAction
} from "@/lib/actions/lifecycle";
import { ContinueReadingSection } from "@/components/me/ContinueReadingSection";
import { CreatorStudioCard } from "@/components/me/CreatorStudioCard";
import { MeDesktopActivitySection } from "@/components/me/MeDesktopActivitySection";
import { AchievementPreview } from "@/components/me/AchievementPreview";
import { ProfileHero } from "@/components/me/ProfileHero";
import { ProfileRefreshAlert } from "@/components/me/ProfileRefreshAlert";
import { ContactFeedbackCard } from "@/components/me/ContactFeedbackCard";
import { SettingsCompact } from "@/components/me/SettingsCompact";
import { BookshelfPreview } from "@/components/me/BookshelfPreview";
import { CollectionsPreview } from "@/components/me/CollectionsPreview";
import { buildReaderProfileSharePayload } from "@/lib/share/profileShare";
import { BadgeList } from "@/components/badges";
import type { ReactNode } from "react";
import { MilestoneSection } from "@/components/milestones/MilestoneSection";
import { ThankYouSection } from "@/components/thankyou";
import { TopFansSection } from "@/components/fans";
import { EarlyFanSection } from "@/components/profile/EarlyFanSection";
import { Card, SectionHeader } from "@/components/ui";
import type { MePageData } from "@/types/me-page";

type DesktopMePageProps = {
  data: MePageData;
  monetizationSection?: ReactNode;
};

export function DesktopMePage({ data, monetizationSection }: DesktopMePageProps) {
  return (
    <section className="hidden space-y-8 lg:block">
      <ProfileRefreshAlert message={data.refreshError} />

      {data.accountNotice ? (
        <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {data.accountNotice}
        </p>
      ) : null}

      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-cyan-300">Tôi</p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal">Trung tâm cá nhân</h1>
      </div>

      <ProfileHero
        avatarUrl={data.user.avatarUrl}
        bio={data.user.bio}
        displayName={data.user.displayName}
        editHref="/me/settings"
        handle={data.user.handle}
        isCreator={data.permissionFlags.canOpenStudio}
        roleBadges={data.profileBadges}
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

      <LifecycleNudge
        nudge={data.lifecycleNudge}
        onDismiss={dismissLifecycleNudgeAction}
        onShown={markLifecycleNudgeShownAction}
      />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-8">
          <ContinueReadingSection items={data.currentlyReading} maxItems={5} variant="hero" />
          <CreatorStudioCard
            creatorProfile={data.creatorProfile}
            stats={data.creatorStats}
          />
          <MeDesktopActivitySection />
          <BookshelfPreview
            description="Những truyện bạn lưu lại sẽ xuất hiện ở đây."
            emptyDescription="Thêm một truyện vào tủ để quay lại đọc sau."
            items={data.readerProfile.savedStories}
            title="Đã lưu"
          />
          <section className="space-y-3">
            <SectionHeader
              action={
                <Link
                  className="tap-highlight inline-flex min-h-11 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 text-sm font-black uppercase tracking-[0.12em] text-cyan-200 transition hover:bg-cyan-300/20"
                  href="/collections/new"
                >
                  + Tạo tủ
                </Link>
              }
              subtitle="Tủ truyện công khai hoặc riêng tư để thể hiện gu đọc."
              title="Tủ truyện của tôi"
            />
            <CollectionsPreview items={data.collections} showHeader={false} />
          </section>
        </div>

        <div className="space-y-8">
          <AchievementPreview items={data.achievementPreview} onViewAllHref="/me?tab=achievements" />

          {data.readerProfile.badgeItems.length > 0 ? (
            <BadgeList
              emptyDescription=""
              emptyTitle=""
              items={data.readerProfile.badgeItems}
              maxVisible={4}
              seeAllLabel="Xem thêm"
              subtitle="Badge đã mở khóa."
              title="Thành tích đọc"
            />
          ) : null}

          {data.readerProfile.milestones.length > 0 ? (
            <MilestoneSection
              emptyDescription=""
              emptyTitle=""
              id="milestones"
              items={data.readerProfile.milestones}
              subtitle="Những cột mốc đáng nhớ."
              title="Cột mốc của tôi"
            />
          ) : null}

          {data.readerProfile.topFanHighlights.length > 0 ? (
            <TopFansSection
              challengeTip=""
              currentUserTip="Bạn đang là Top Fan #{rank}."
              emptyDescription=""
              emptyTitle=""
              items={data.readerProfile.topFanHighlights}
              subtitle="Danh hiệu Top Fan bạn đang giữ."
              title="Top Fan"
            />
          ) : null}

          {data.thankYous.length > 0 ? (
            <ThankYouSection
              emptyDescription=""
              emptyTitle=""
              items={data.thankYous}
              subtitle="Lời cảm ơn dành cho bạn."
              title="Lời cảm ơn từ tác giả"
            />
          ) : null}

          {data.readerProfile.earlyFanStories.length > 0 ? (
            <EarlyFanSection items={data.readerProfile.earlyFanStories} />
          ) : null}

          {data.readerProfile.favoriteGenres.length > 0 ? (
            <section className="space-y-3">
              <SectionHeader title="Thể loại yêu thích" />
              <Card className="flex flex-wrap gap-2 p-4">
                {data.readerProfile.favoriteGenres.map((genre) => (
                  <span
                    className="chap-pill px-3 py-2 text-sm font-semibold text-zinc-100"
                    key={genre.name}
                  >
                    {genre.name}
                  </span>
                ))}
              </Card>
            </section>
          ) : null}

          {monetizationSection}

          <ContactFeedbackCard
            settings={data.contactSettings}
            userEmail={data.user.email}
          />

          <SettingsCompact unreadNotificationCount={data.unreadNotificationCount} />
        </div>
      </div>
    </section>
  );
}
