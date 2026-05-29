import Link from "next/link";
import { AdminAnalyticsOverview } from "@/components/admin/analytics/AdminAnalyticsOverview";
import { AdminAnalyticsRangeTabs } from "@/components/admin/analytics/AdminAnalyticsRangeTabs";
import { AdminEngagementMetrics } from "@/components/admin/analytics/AdminEngagementMetrics";
import { AdminSafetyMetrics } from "@/components/admin/analytics/AdminSafetyMetrics";
import { ErrorState, SectionHeader } from "@/components/ui";
import {
  getAdminAnalytics,
  getAdminAnalyticsRange
} from "@/lib/admin/getAdminAnalytics";
import { requireAdminOrModerator } from "@/lib/auth/requireAdminOrModerator";

type AdminAnalyticsPageProps = {
  searchParams: Promise<{
    range?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage({
  searchParams
}: AdminAnalyticsPageProps) {
  const params = await searchParams;
  const activeRange = getAdminAnalyticsRange(params.range);
  const guard = await requireAdminOrModerator("/admin/analytics");

  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <SectionHeader title="Khong co quyen truy cap" />
        <ErrorState
          message={guard.error}
          title="Không có quyền truy cập admin"
          variant="danger"
        />
      </section>
    );
  }

  const data = await getAdminAnalytics(activeRange);

  return (
    <section className="space-y-6">
      <Link
        className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
        href="/admin"
      >
        ← Admin
      </Link>
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-cyan-300">
          Admin
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal">
          Platform analytics
        </h1>
        <p className="mt-4 text-sm leading-6 text-zinc-400">
          MVP health view for content, reading engagement, reports, and
          community moderation.
        </p>
      </div>

      <AdminAnalyticsRangeTabs activeRange={data.activeRange} />

      {data.error ? (
        <ErrorState message={data.error} title="Không tải được phân tích" />
      ) : null}

      <AdminAnalyticsOverview metrics={data.platform} />
      <AdminEngagementMetrics metrics={data.engagement} />
      <AdminSafetyMetrics metrics={data.safety} />
    </section>
  );
}
