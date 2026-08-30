"use client";

import { EmptyState, ErrorState, SectionHeader } from "@/components/ui";
import { StatCard } from "@/components/creator/StatCard";
import { StoryPerformanceCard } from "@/components/creator/StoryPerformanceCard";
import { HighlightCard } from "@/components/creator/HighlightCard";
import { DashboardSkeleton } from "@/components/creator/DashboardSkeleton";
import { MilestoneCard } from "@/components/milestones/MilestoneCard";
import { TopFanBadge } from "@/components/fans/TopFanBadge";
import type { CreatorDashboardData } from "@/lib/creator/getCreatorDashboardData";

type CreatorDashboardClientProps = {
  initialData: CreatorDashboardData;
  loading: boolean;
  error: string | null;
};

export function CreatorDashboardClient({
  initialData,
  loading,
  error
}: CreatorDashboardClientProps) {
  if (error) {
    return (
      <ErrorState
        message={error}
        title="Không tải được tổng quan Studio"
        variant="warning"
      />
    );
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!initialData.creatorProfile) {
    return (
      <div className="space-y-6">
        <div>
          <p className="page-kicker">Trang tác giả</p>
          <h1 className="page-title">Bạn chưa có hồ sơ tác giả</h1>
          <p className="page-copy">
            Đăng truyện đầu tiên để bắt đầu xây cộng đồng độc giả và theo dõi
            thành tích của bạn.
          </p>
        </div>
        <EmptyState
          action={
            <a
              className="tap-highlight inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-5 text-sm font-black uppercase tracking-[0.12em] text-zinc-950 transition hover:bg-cyan-200"
              href="/studio"
            >
              Bắt đầu viết
            </a>
          }
          description="Bắt đầu hành trình viết truyện trên ChapMee."
          title="Tác giả mới"
        />
      </div>
    );
  }

  if (!initialData.hasStories) {
    return (
      <div className="space-y-6">
        <DashboardHeader
          displayName={initialData.creatorProfile.display_name}
          bio={initialData.creatorProfile.bio}
        />
        <EmptyState
          action={
            <a
              className="tap-highlight inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-5 text-sm font-black uppercase tracking-[0.12em] text-zinc-950 transition hover:bg-cyan-200"
              href="/studio/stories/new"
            >
              Tạo truyện đầu tiên
            </a>
          }
          description="Bắt đầu hành trình viết truyện trên ChapMee."
          title="Tác giả mới"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <DashboardHeader
        displayName={initialData.creatorProfile.display_name}
        bio={initialData.creatorProfile.bio}
      />

      {initialData.highlights.length > 0 && (
        <section className="space-y-3">
          <SectionHeader
            subtitle="Những khoảnh khắc đáng nhớ trên hành trình sáng tác."
            title="🌟 Thành tích nổi bật"
          />
          <div className="space-y-3">
            {initialData.highlights.map((h, i) => (
              <HighlightCard key={i} highlight={h} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <SectionHeader
          subtitle="Tổng quan hiệu suất các truyện của bạn."
          title="📊 Tổng quan"
        />
        <div className="grid grid-cols-2 gap-3">
          {initialData.stats.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader
          action={
            <a
              className="tap-highlight inline-flex min-h-9 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3.5 text-[0.7rem] font-black uppercase tracking-[0.12em] text-cyan-200 transition hover:bg-cyan-300/20"
              href="/studio/stories/new"
            >
              + Thêm truyện
            </a>
          }
          subtitle="Hiệu suất từng truyện của bạn."
          title="📖 Truyện của bạn"
        />
        {initialData.stories.length === 0 ? (
          <EmptyState
            description="Tạo truyện đầu tiên để bắt đầu."
            title="Chưa có truyện nào"
          />
        ) : (
          <div className="space-y-3">
            {initialData.stories.map((story) => (
              <StoryPerformanceCard key={story.id} story={story} />
            ))}
          </div>
        )}
      </section>

      {initialData.topFans.length > 0 && (
        <section className="space-y-3">
          <SectionHeader
            subtitle="Những độc giả tương tác nhiều nhất với truyện của bạn."
            title="🌟 Top Fan"
          />
          <div className="space-y-3">
            {initialData.topFans.map((fan) => (
              <TopFanBadge key={fan.id} item={fan} />
            ))}
          </div>
        </section>
      )}

      {initialData.milestones.length > 0 && (
        <section className="space-y-3">
          <SectionHeader
            subtitle="Những cột mốc đã đạt được trên hành trình sáng tác."
            title="🏆 Cột mốc"
          />
          <div className="space-y-3">
            {initialData.milestones.map((milestone) => (
              <MilestoneCard key={milestone.id} milestone={milestone} />
            ))}
          </div>
        </section>
      )}

      <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4">
        <p className="text-center text-sm leading-6 text-zinc-500">
          Tổng quan này chỉ hiển thị dữ liệu của riêng bạn.
          <br />
          Doanh thu được tính sau phí kênh thanh toán, refund/chargeback nếu có và theo tỉ lệ chia doanh thu từng module.
          <br />
          <a
            className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200"
            href="/studio"
          >
            Mở Studio
          </a>{" "}
          để quản lý truyện và chap chi tiết hơn.
        </p>
      </div>
    </div>
  );
}

function DashboardHeader({
  displayName,
  bio
}: {
  displayName: string;
  bio: string | null;
}) {
  return (
    <div>
      <p className="page-kicker">ChapMee Studio</p>
      <h1 className="page-title">
        Chào mừng, {displayName}
      </h1>
      {bio ? (
        <p className="page-copy">{bio}</p>
      ) : (
        <p className="page-copy">
          Đây là nơi bạn theo dõi hành trình sáng tác và khoe thành tích với cộng
          đồng.
        </p>
      )}
    </div>
  );
}
