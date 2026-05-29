import Link from "next/link";
import { ErrorState, SectionHeader } from "@/components/ui";
import { requireFinanceAccess } from "@/lib/auth/require-permission";
import { getMonetizationConfig } from "@/lib/monetization/config";
import { listCreatorBonusAllocationsByPool, listCreatorBonusPools } from "@/lib/supabase/creator-bonus";
import { BonusPoolManager } from "@/components/admin/bonus/BonusPoolManager";

export const dynamic = "force-dynamic";

export default async function AdminBonusPoolsPage() {
  const guard = await requireFinanceAccess("/admin/bonus-pools");
  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <SectionHeader title="Không có quyền truy cập" subtitle="Chỉ dành cho quản trị viên hoặc founder." />
        <ErrorState message={guard.error} title="Không có quyền truy cập admin" variant="danger" />
      </section>
    );
  }

  const { settings } = await getMonetizationConfig({ includePrivate: true });
  const enabled =
    Boolean(settings["monetization.enabled"]) &&
    Boolean(settings["creator_monetization.enabled"]) &&
    Boolean(settings["creator_bonus_pool.enabled"]);
  if (!enabled) {
    return (
      <section className="space-y-6">
        <Link className="text-sm font-semibold text-cyan-300 hover:text-cyan-200" href="/admin">
          ← Admin
        </Link>
        <ErrorState title="Bonus pool đang tắt" message="Creator bonus pool đang tắt bởi admin flags." />
      </section>
    );
  }

  const pools = await listCreatorBonusPools(100);
  if (pools.error) {
    return (
      <section className="space-y-6">
        <ErrorState title="Không tải được bonus pool" message={pools.error} />
      </section>
    );
  }

  const allocationsByPool: Record<string, Awaited<ReturnType<typeof listCreatorBonusAllocationsByPool>>["data"]> = {};
  for (const pool of pools.data) {
    const allocations = await listCreatorBonusAllocationsByPool(pool.id);
    allocationsByPool[pool.id] = allocations.data;
  }

  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm font-semibold text-cyan-300 hover:text-cyan-200" href="/admin">
          ← Admin
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-normal">Creator Bonus Pools</h1>
      </div>
      <BonusPoolManager allocationsByPool={allocationsByPool} pools={pools.data} />
    </section>
  );
}
