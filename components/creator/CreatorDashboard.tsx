import Link from "next/link";
import { CreatorAlertsList } from "@/components/creator/CreatorAlertsList";
import { ContinueWritingList } from "@/components/creator/ContinueWritingList";
import { CreatorOverviewCards } from "@/components/creator/CreatorOverviewCards";
import { CreatorPerformanceSection } from "@/components/creator/CreatorPerformanceSection";
import { CreatorQuickActions } from "@/components/creator/CreatorQuickActions";
import { ScheduledChaptersCard } from "@/components/creator/ScheduledChaptersCard";
import { ErrorState, SectionHeader } from "@/components/ui";
import type { ReactNode } from "react";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import {
  STUDIO_BASE_PATH,
  STUDIO_FULL_NAME,
  STUDIO_TAGLINE,
  studioPath
} from "@/lib/studio/constants";
import type { CreatorStudioDashboardData } from "@/types/creator";

export type CreatorDashboardProps = {
  basePath?: string;
  creatorProfile: CreatorProfile;
  data: CreatorStudioDashboardData;
};

const primaryBtnClass =
  "tap-highlight inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-cyan-300 px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-zinc-950 transition hover:bg-cyan-200 sm:flex-none sm:px-4 sm:text-sm sm:tracking-[0.12em]";
const secondaryBtnClass =
  "tap-highlight inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-zinc-100 transition hover:border-white/20 hover:bg-white/[0.08] sm:flex-none sm:px-4 sm:text-sm sm:tracking-[0.12em]";

function DashboardSection({
  children,
  id,
  title
}: {
  children: ReactNode;
  id?: string;
  title: string;
}) {
  return (
    <section className="space-y-3" id={id}>
      <SectionHeader title={title} />
      {children}
    </section>
  );
}

export function CreatorDashboard({
  basePath = STUDIO_BASE_PATH,
  creatorProfile,
  data
}: CreatorDashboardProps) {
  return (
    <div className="space-y-6 pb-8 sm:space-y-8">
      <header className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
            {STUDIO_FULL_NAME}
          </p>
          <p className="text-sm leading-relaxed text-zinc-400">{STUDIO_TAGLINE}</p>
          <h1 className="text-xl font-black tracking-normal text-white sm:text-2xl">
            Tổng quan Studio
          </h1>
          <p className="text-sm text-zinc-300">
            Xin chào, <span className="font-semibold text-white">{creatorProfile.display_name}</span>
          </p>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <Link className={primaryBtnClass} href={data.writeChapterHref}>
            {data.writeActionLabel}
          </Link>
          <Link className={secondaryBtnClass} href={studioPath("/stories/new")}>
            Tạo truyện
          </Link>
        </div>
      </header>

      {data.error ? (
        <ErrorState message={data.error} title="Không tải được dữ liệu" />
      ) : null}

      <DashboardSection title="Tổng quan Studio">
        <CreatorOverviewCards overview={data.overview} />
      </DashboardSection>

      <DashboardSection title="Viết tiếp">
        <ContinueWritingList
          items={data.continueWriting}
          writeChapterHref={data.writeChapterHref}
        />
      </DashboardSection>

      <DashboardSection id="lich-dang" title="Lịch đăng">
        <ScheduledChaptersCard items={data.scheduledChapters} />
      </DashboardSection>

      <DashboardSection title="Hiệu quả gần đây">
        <CreatorPerformanceSection
          hasStories={data.hasStories}
          performance={data.performance7d}
        />
      </DashboardSection>

      <DashboardSection title="Việc cần làm">
        <CreatorAlertsList alerts={data.alerts} />
      </DashboardSection>

      <DashboardSection title="Công cụ Studio">
        <CreatorQuickActions
          basePath={basePath}
          defaultStorySlug={data.defaultStorySlug}
          qualityNeedsActionCount={data.qualityNeedsActionCount}
          writeActionLabel={data.writeActionLabel}
          writeChapterHref={data.writeChapterHref}
        />
      </DashboardSection>
    </div>
  );
}
