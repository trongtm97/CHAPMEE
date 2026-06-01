import Link from "next/link";
import { CreatorOnboardingCard } from "@/components/creator/CreatorOnboardingCard";
import { StudioContinueWriting } from "@/components/studio/dashboard/StudioContinueWriting";
import { StudioHero } from "@/components/studio/dashboard/StudioHero";
import { StudioNeedsAttention } from "@/components/studio/dashboard/StudioNeedsAttention";
import { StudioPerformancePanels } from "@/components/studio/dashboard/StudioPerformancePanels";
import { StudioQuickStats } from "@/components/studio/dashboard/StudioQuickStats";
import { StudioSchedulePreview } from "@/components/studio/dashboard/StudioSchedulePreview";
import { StudioDashboardSection } from "@/components/studio/dashboard/shared/StudioDashboardSection";
import { StudioPanel, StudioPanelBody } from "@/components/studio/dashboard/shared/StudioPanel";
import { StudioSectionHeader } from "@/components/studio/dashboard/shared/StudioSectionHeader";
import { StudioTodayActions } from "@/components/studio/dashboard/StudioTodayActions";
import { StudioToolGrid } from "@/components/studio/dashboard/StudioToolGrid";
import { ErrorState } from "@/components/ui";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import { filterAttentionGroupsForDashboard } from "@/lib/studio/filter-attention-groups";
import { STUDIO_BASE_PATH, studioPath } from "@/lib/studio/constants";
import type { CreatorStudioDashboardData } from "@/types/creator";

export type StudioDashboardProps = {
  basePath?: string;
  creatorProfile: CreatorProfile;
  data: CreatorStudioDashboardData;
};

function ViewAllLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="tap-highlight text-xs font-semibold text-cyan-300 transition hover:text-cyan-200"
      href={href}
    >
      {label}
    </Link>
  );
}

export function StudioDashboard({
  basePath = STUDIO_BASE_PATH,
  creatorProfile,
  data
}: StudioDashboardProps) {
  const attentionGroups = filterAttentionGroupsForDashboard(
    data.attentionGroups,
    data.todayActions
  );

  const showNeedsAttention = attentionGroups.length > 0;

  return (
    <div className="w-full min-w-0 space-y-2.5 pb-4 sm:space-y-4 sm:pb-5">
      <StudioHero
        accountStatus={data.accountStatus}
        creatorProfile={creatorProfile}
        heroSummary={data.heroSummary}
        writeActionLabel={data.writeActionLabel}
        writeChapterHref={data.writeChapterHref}
      />

      {data.error ? (
        <ErrorState message={data.error} title="Không tải được dữ liệu" />
      ) : null}

      {!data.hasStories ? <CreatorOnboardingCard /> : null}

      <div className="grid gap-2.5 sm:gap-3.5 xl:grid-cols-5 xl:gap-4">
        <section className="xl:col-span-3">
          <StudioPanel minHeight="none">
            <div className="border-b border-white/10 px-2.5 py-2 sm:px-3.5 sm:py-2.5">
              <StudioSectionHeader emphasized title="Hôm nay cần làm gì?" />
            </div>
            <StudioPanelBody className="bg-cyan-300/[0.02]">
              <StudioTodayActions
                actions={data.todayActions}
                writeActionLabel={data.writeActionLabel}
                writeChapterHref={data.writeChapterHref}
              />
            </StudioPanelBody>
          </StudioPanel>
        </section>

        <section className="xl:col-span-2">
          <StudioPanel minHeight="none">
            <div className="border-b border-white/10 px-2.5 py-2 sm:px-3.5 sm:py-2.5">
              <StudioSectionHeader title="Số liệu nhanh" />
            </div>
            <StudioPanelBody>
              <StudioQuickStats compact stats={data.quickStats} />
            </StudioPanelBody>
          </StudioPanel>
        </section>
      </div>

      <div
        className={`grid items-stretch gap-2.5 sm:gap-3.5 lg:grid-cols-2 lg:gap-4 ${
          showNeedsAttention ? "" : "lg:grid-cols-1"
        }`}
      >
        <StudioDashboardSection
          action={<ViewAllLink href={studioPath("/drafts")} label="Xem tất cả" />}
          panelMinHeight="none"
          title="Viết tiếp"
        >
          <StudioContinueWriting
            items={data.continueWriting}
            writeChapterHref={data.writeChapterHref}
          />
        </StudioDashboardSection>

        {showNeedsAttention ? (
          <StudioDashboardSection
            panelMinHeight="none"
            subtitle="Tồn đọng — không trùng việc hôm nay"
            title="Cần xử lý"
          >
            <StudioNeedsAttention groups={attentionGroups} maxVisible={2} />
          </StudioDashboardSection>
        ) : null}
      </div>

      <div className="grid items-stretch gap-2.5 sm:gap-3.5 lg:grid-cols-2 lg:gap-4">
        <StudioDashboardSection
          action={
            <ViewAllLink href={studioPath("/calendar")} label="Xem tất cả" />
          }
          id="lich-dang"
          panelMinHeight="none"
          title="Lịch đăng"
        >
          <StudioSchedulePreview items={data.scheduledChapters} />
        </StudioDashboardSection>

        <StudioDashboardSection
          action={
            <ViewAllLink href={studioPath("/analytics")} label="Xem thống kê" />
          }
          panelMinHeight="none"
          title="Hiệu quả gần đây"
        >
          <StudioPerformancePanels
            compact
            fillHeight
            hasStories={data.hasStories}
            snapshot={data.performanceSnapshot}
          />
        </StudioDashboardSection>
      </div>

      <section>
        <StudioPanel minHeight="none">
          <div className="border-b border-white/10 px-2.5 py-2 sm:px-3.5 sm:py-2.5">
            <StudioSectionHeader title="Công cụ Studio" />
          </div>
          <StudioPanelBody className="py-2 sm:py-3.5">
            <StudioToolGrid
              basePath={basePath}
              compact
              defaultStorySlug={data.defaultStorySlug}
              qualityNeedsActionCount={data.qualityNeedsActionCount}
              writeChapterHref={data.writeChapterHref}
              writeToolLabel={data.writeToolLabel}
            />
          </StudioPanelBody>
        </StudioPanel>
      </section>
    </div>
  );
}
