import Link from "next/link";
import { MoneySettingCard } from "@/components/admin/MoneySettingCard";
import type { CreatorFeeOverrideStats } from "@/lib/admin/get-creator-fee-override-stats";

type CreatorOverrideStatsCardProps = {
  stats: CreatorFeeOverrideStats;
};

export function CreatorOverrideStatsCard({ stats }: CreatorOverrideStatsCardProps) {
  return (
    <MoneySettingCard
      description="Tác giả có % riêng hoặc chính sách phí không bị ảnh hưởng khi đổi % mặc định toàn hệ thống."
      id="creator-overrides"
      title="Tùy chỉnh theo tác giả"
    >
      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <dt className="text-xs text-zinc-500">Tỷ lệ riêng (profile)</dt>
          <dd className="mt-1 text-2xl font-semibold text-white">
            {stats.customRateCreators}
          </dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <dt className="text-xs text-zinc-500">Chính sách phí đang hiệu lực</dt>
          <dd className="mt-1 text-2xl font-semibold text-cyan-300">
            {stats.activeFeePolicies}
          </dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <dt className="text-xs text-zinc-500">Cần rà soát (sắp hết hạn / lên lịch)</dt>
          <dd className="mt-1 text-2xl font-semibold text-amber-300">
            {stats.policiesNeedingReview}
          </dd>
        </div>
      </dl>
      <Link
        className="tap-highlight inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] text-zinc-100 transition hover:border-white/20"
        href="/admin/creator-fee-policies"
      >
        Quản lý phí tác giả
      </Link>
    </MoneySettingCard>
  );
}
