import Link from "next/link";
import { CreatorStudioCard } from "@/components/me/CreatorStudioCard";
import { CombinedEmptyState } from "@/components/me/CombinedEmptyState";
import { EarlyFanSection } from "@/components/profile/EarlyFanSection";
import { ThankYouSection } from "@/components/thankyou";
import { TopFansSection } from "@/components/fans";
import { Card, SectionHeader } from "@/components/ui";
import type { MePageData } from "@/types/me-page";

type WritingTabProps = {
  data: MePageData;
};

export function WritingTab({ data }: WritingTabProps) {
  const isCreator = Boolean(data.creatorProfile);
  const hasFanContent =
    data.readerProfile.topFanHighlights.length > 0 ||
    data.readerProfile.earlyFanStories.length > 0 ||
    data.thankYous.length > 0;

  if (!isCreator && !hasFanContent) {
    return (
      <div className="space-y-4">
        <CreatorStudioCard creatorProfile={null} stats={null} />
        <CombinedEmptyState
          description="Đăng truyện đầu tiên để mở Studio và theo dõi cộng đồng độc giả."
          title="Bạn chưa bắt đầu hành trình sáng tác."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CreatorStudioCard
        creatorProfile={data.creatorProfile}
        stats={data.creatorStats}
      />

      {isCreator ? (
        <>
          {data.creatorStats ? (
            <section className="space-y-2">
              <SectionHeader title="Thống kê nhanh" />
              <Card className="grid grid-cols-3 gap-2 p-3">
                <Stat label="Truyện" value={data.creatorStats.stories} />
                <Stat label="Lượt đọc" value={data.creatorStats.reads} />
                <Stat label="Bình luận" value={data.creatorStats.comments} />
              </Card>
            </section>
          ) : null}

          <section className="space-y-2">
            <SectionHeader title="Truyện của tôi" />
            <Card className="flex flex-wrap gap-2 p-3">
              <ActionLink href="/studio/stories" label="Quản lý truyện" />
              <ActionLink href="/studio/stories/new" label="Đăng truyện" />
              <ActionLink href="/studio" label="Mở Studio" />
            </Card>
          </section>
        </>
      ) : null}

      {data.thankYous.length > 0 ? (
        <ThankYouSection
          emptyDescription=""
          emptyTitle=""
          items={data.thankYous}
          subtitle="Lời cảm ơn dành cho bạn hoặc nhóm độc giả."
          title="Lời cảm ơn"
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

      {data.readerProfile.earlyFanStories.length > 0 ? (
        <EarlyFanSection items={data.readerProfile.earlyFanStories} />
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.02] px-2 py-2 text-center">
      <p className="text-sm font-black text-white">{value}</p>
      <p className="mt-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-zinc-600">
        {label}
      </p>
    </div>
  );
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="inline-flex min-h-8 items-center rounded-full border border-white/10 px-3 text-xs font-semibold text-zinc-200 transition hover:border-cyan-300/25 hover:text-cyan-100"
      href={href}
    >
      {label}
    </Link>
  );
}
