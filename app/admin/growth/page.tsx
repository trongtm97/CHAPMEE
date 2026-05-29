import Link from "next/link";
import { GrowthDashboard } from "@/components/admin/growth/GrowthDashboard";
import { ErrorState } from "@/components/ui";
import { requireAdminOrModerator } from "@/lib/auth/requireAdminOrModerator";
import {
  getGrowthDashboardData,
  getGrowthRange
} from "@/lib/supabase/growth-dashboard";

type GrowthPageProps = {
  searchParams: Promise<{ range?: string }>;
};

export const dynamic = "force-dynamic";

export default async function AdminGrowthPage({ searchParams }: GrowthPageProps) {
  const params = await searchParams;
  const range = getGrowthRange(params.range);
  const guard = await requireAdminOrModerator("/admin/growth");

  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-cyan-300">
            Admin
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-normal">
            Không có quyền truy cập
          </h1>
        </div>
        <ErrorState message={guard.error} title="Không có quyền truy cập admin" variant="danger" />
      </section>
    );
  }

  const data = await getGrowthDashboardData(range);

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
        <h1 className="mt-3 text-3xl font-bold tracking-normal">Growth dashboard</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          KPI tang truong va suc khoe san pham cho founder/admin.
        </p>
      </div>
      {data.error ? (
        <ErrorState message={data.error} title="Không tải được bảng tăng trưởng" />
      ) : null}
      <GrowthDashboard data={data} />
    </section>
  );
}
