import Link from "next/link";
import { FunnelTable } from "@/components/admin/growth/FunnelTable";
import { KpiCard } from "@/components/admin/growth/KpiCard";
import { TopContentTable } from "@/components/admin/growth/TopContentTable";
import { Card } from "@/components/ui";
import type { GrowthDashboardData, GrowthRange } from "@/types/growth";

type GrowthDashboardProps = {
  data: GrowthDashboardData;
};

const ranges: Array<{ value: GrowthRange; label: string }> = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "All time" }
];

function formatRate(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function GrowthDashboard({ data }: GrowthDashboardProps) {
  return (
    <section className="space-y-6">
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-1 sm:grid-cols-4">
        {ranges.map((range) => {
          const isActive = range.value === data.range;
          return (
            <Link
              className={`rounded-md px-3 py-2 text-center text-sm font-semibold transition ${
                isActive
                  ? "bg-cyan-300 text-zinc-950"
                  : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
              }`}
              href={`/admin/growth?range=${range.value}`}
              key={range.value}
            >
              {range.label}
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="New users" value={data.kpis.newUsers} />
        <KpiCard label="DAU" value={data.kpis.dau} />
        <KpiCard label="WAU" value={data.kpis.wau} />
        <KpiCard label="MAU" value={data.kpis.mau} />
        <KpiCard label="Sessions" value={data.kpis.sessions} />
        <KpiCard label="Swipe item views" value={data.kpis.swipeItemViews} />
        <KpiCard label="Story views" value={data.kpis.storyViews} />
        <KpiCard label="Chapter opens" value={data.kpis.chapterOpens} />
        <KpiCard label="Chapter completions" value={data.kpis.chapterCompletions} />
        <KpiCard label="Read more clicks" value={data.kpis.readMoreClicks} />
        <KpiCard label="Likes" value={data.kpis.likes} />
        <KpiCard label="Saves" value={data.kpis.saves} />
        <KpiCard label="Follows" value={data.kpis.follows} />
        <KpiCard label="Comments" value={data.kpis.comments} />
        <KpiCard label="Shares" value={data.kpis.shares} />
        <KpiCard label="New stories" value={data.kpis.newStories} />
        <KpiCard label="New chapters" value={data.kpis.newChapters} />
        <KpiCard label="Active authors" value={data.kpis.activeAuthors} />
        <KpiCard label="Active readers" value={data.kpis.activeReaders} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <FunnelTable
          steps={data.onboardingFunnel}
          subtitle="Onboarding started -> completed/skipped"
          title="Phễu onboarding"
        />
        <FunnelTable
          steps={data.swipeFunnel}
          subtitle="Swipe exposure -> chapter completion"
          title="Phễu swipe"
        />
        <FunnelTable
          steps={data.creatorFunnel}
          subtitle="Creator dashboard -> publish flow"
          title="Phễu tác giả"
        />
      </div>

      <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <p className="text-sm text-zinc-200">
          Read more rate: <span className="font-black">{formatRate(data.rates.readMoreRate)}</span>
        </p>
        <p className="text-sm text-zinc-200">
          Chapter completion rate:{" "}
          <span className="font-black">{formatRate(data.rates.chapterCompletionRate)}</span>
        </p>
        <p className="text-sm text-zinc-200">
          Comment rate: <span className="font-black">{formatRate(data.rates.commentRate)}</span>
        </p>
        <p className="text-sm text-zinc-200">
          Share rate: <span className="font-black">{formatRate(data.rates.shareRate)}</span>
        </p>
        <p className="text-sm text-zinc-200">
          Follow rate: <span className="font-black">{formatRate(data.rates.followRate)}</span>
        </p>
        <p className="text-sm text-zinc-200">
          Onboarding completion rate:{" "}
          <span className="font-black">{formatRate(data.rates.onboardingCompletionRate)}</span>
        </p>
        <p className="text-sm text-zinc-200">
          Creator publish rate:{" "}
          <span className="font-black">{formatRate(data.rates.creatorPublishRate)}</span>
        </p>
      </Card>

      <Card className="space-y-2 p-4">
        <p className="text-base font-black text-white">Creator metrics</p>
        <div className="grid gap-2 text-sm text-zinc-200 sm:grid-cols-2 lg:grid-cols-3">
          <p>New authors: <span className="font-black">{data.creatorMetrics.newAuthors}</span></p>
          <p>Active authors: <span className="font-black">{data.creatorMetrics.activeAuthors}</span></p>
          <p>Stories published: <span className="font-black">{data.creatorMetrics.storiesPublished}</span></p>
          <p>Chapters published: <span className="font-black">{data.creatorMetrics.chaptersPublished}</span></p>
          <p>Avg chapters/active author: <span className="font-black">{data.creatorMetrics.averageChaptersPerActiveAuthor.toFixed(2)}</span></p>
          <p>Authors with comments: <span className="font-black">{data.creatorMetrics.authorsWithComments}</span></p>
          <p>Authors returning this week: <span className="font-black">{data.creatorMetrics.authorsReturningThisWeek}</span></p>
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <TopContentTable
          rows={data.topStoriesByViews.map((item) => ({
            id: item.storyId,
            label: item.storyTitle,
            subLabel: item.creatorName,
            value: item.value
          }))}
          subtitle="Top stories by story views."
          title="Truyện xem nhiều nhất"
          valueLabel="Views"
        />
        <TopContentTable
          rows={data.topStoriesByReadMore.map((item) => ({
            id: item.storyId,
            label: item.storyTitle,
            subLabel: item.creatorName,
            value: item.value
          }))}
          subtitle="Truyện read-more nhiều nhất clicks from swipe."
          title="Truyện read-more nhiều nhất"
          valueLabel="Read more"
        />
        <TopContentTable
          rows={data.topStoriesByShares.map((item) => ({
            id: item.storyId,
            label: item.storyTitle,
            subLabel: item.creatorName,
            value: item.value
          }))}
          subtitle="Top stories by share events."
          title="Truyện chia sẻ nhiều nhất"
          valueLabel="Shares"
        />
        <TopContentTable
          rows={data.topAuthorsByGrowth.map((item) => ({
            id: item.authorId,
            label: item.penName,
            value: item.value
          }))}
          subtitle="Top authors by story-view growth."
          title="Tác giả tăng trưởng nhanh nhất"
          valueLabel="Growth"
        />
      </div>

      <Card className="space-y-2 p-4">
        <p className="text-base font-black text-white">Content health</p>
        <p className="text-sm text-zinc-300">
          Reported/flagged content:{" "}
          <span className="font-black">{data.reportedContentCount}</span>
        </p>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="space-y-2 p-4">
          <p className="text-base font-black text-white">Referral & marketing</p>
          <p className="text-sm text-zinc-300">
            Referral opens: <span className="font-black">{data.referral.referralLinkOpens}</span>
          </p>
          <p className="text-sm text-zinc-300">
            Referral signups: <span className="font-black">{data.referral.referralSignups}</span>
          </p>
          <p className="text-sm text-zinc-300">
            Người giới thiệu hàng đầu: {data.referral.topReferrers.length || 0}
          </p>
          <p className="text-sm text-zinc-300">
            UTM sources: {data.referral.usersByUtmSource.length || 0}
          </p>
          <p className="text-sm text-zinc-300">
            UTM campaigns: {data.referral.signupsByUtmCampaign.length || 0}
          </p>
          <p className="text-sm text-zinc-300">
            Activations by source: {data.referral.activationsBySource.length || 0}
          </p>
        </Card>
        <Card className="space-y-2 p-4">
          <p className="text-base font-black text-white">Notification performance</p>
          <p className="text-sm text-zinc-300">
            Notifications created: <span className="font-black">{data.notifications.notificationsCreated}</span>
          </p>
          <p className="text-sm text-zinc-300">
            Notifications read: <span className="font-black">{data.notifications.notificationsRead}</span>
          </p>
          <p className="text-sm text-zinc-300">
            Notification clicks: <span className="font-black">{data.notifications.notificationClicks}</span>
          </p>
          <p className="text-sm text-zinc-300">
            Unread total: <span className="font-black">{data.notifications.unreadTotal}</span>
          </p>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <TopContentTable
          rows={data.referral.topReferrers.map((item) => ({
            id: item.referrerId,
            label: item.referrerId,
            value: item.value
          }))}
          subtitle="Top users driving referral opens/signups."
          title="Người giới thiệu hàng đầu"
          valueLabel="Events"
        />
        <TopContentTable
          rows={data.referral.usersByUtmSource.map((item) => ({
            id: item.source,
            label: item.source,
            value: item.value
          }))}
          subtitle="Users/events grouped by UTM source."
          title="User theo nguồn UTM"
          valueLabel="Users"
        />
        <TopContentTable
          rows={data.referral.signupsByUtmCampaign.map((item) => ({
            id: item.campaign,
            label: item.campaign,
            value: item.value
          }))}
          subtitle="Signup events grouped by UTM campaign."
          title="Đăng ký theo campaign UTM"
          valueLabel="Signups"
        />
        <TopContentTable
          rows={data.referral.activationsBySource.map((item) => ({
            id: item.source,
            label: item.source,
            value: item.value
          }))}
          subtitle="Activation-completed events grouped by source."
          title="Kích hoạt theo nguồn"
          valueLabel="Activations"
        />
      </div>

      <Card className="space-y-2 p-4">
        <p className="text-base font-black text-white">Revenue</p>
        {data.revenue.hasRevenueData ? (
          <div className="grid gap-2 text-sm text-zinc-300 sm:grid-cols-2 lg:grid-cols-4">
            <p>Gross revenue: <span className="font-black">{data.revenue.grossRevenue}</span></p>
            <p>Net creator revenue: <span className="font-black">{data.revenue.netCreatorRevenue}</span></p>
            <p>Paid readers: <span className="font-black">{data.revenue.paidReaders}</span></p>
            <p>Paying conversion: <span className="font-black">{formatRate(data.revenue.payingConversion)}</span></p>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Chua co du lieu revenue.</p>
        )}
      </Card>
      {data.revenue.hasRevenueData ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <TopContentTable
            rows={data.revenue.topEarningAuthors.map((item) => ({
              id: item.authorId,
              label: item.penName,
              value: item.grossRevenue
            }))}
            subtitle="Highest grossing authors in selected range."
            title="Tác giả doanh thu cao nhất"
            valueLabel="Gross"
          />
          <TopContentTable
            rows={data.revenue.topSupporters.map((item) => ({
              id: item.userId,
              label: item.displayName,
              value: item.totalSupported
            }))}
            subtitle="Users with highest support amount."
            title="Người ủng hộ hàng đầu"
            valueLabel="Supported"
          />
        </div>
      ) : null}
    </section>
  );
}
