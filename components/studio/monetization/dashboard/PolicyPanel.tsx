import type { ReactNode } from "react";
import Link from "next/link";
import { CreatorRevenuePolicySection } from "@/components/studio/monetization/CreatorRevenuePolicySection";
import { CreatorAdRevenuePolicyCard } from "@/components/studio/ads-revenue/CreatorAdRevenuePolicyCard";
import { CreatorAdRevenueWarningCard } from "@/components/studio/ads-revenue/CreatorAdRevenueWarningCard";
import { payoutCycleLabel } from "@/lib/studio/monetization-labels";
import { formatMonetizationVnd } from "@/lib/studio/format-monetization-display";
import type { CreatorAdRevenueDashboard } from "@/types/creator-ad-revenue-dashboard";
import type { StudioMonetizationPageData } from "@/types/studio-monetization";

type PolicyPanelProps = {
  data: StudioMonetizationPageData;
  adDashboard: CreatorAdRevenueDashboard;
};

export function PolicyPanel({ data, adDashboard }: PolicyPanelProps) {
  const { config, revenuePolicy } = data;
  const adPolicy = adDashboard.sharing.policy;

  return (
    <div className="space-y-6">
      <CreatorAdRevenueWarningCard />

      <section className="rounded-2xl border border-white/10 bg-zinc-950/40 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-white">Chính sách đang áp dụng</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Tỷ lệ, ngưỡng và chu kỳ do quản trị cấu hình — creator không thể chỉnh tại đây.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <PolicyBlock title="Truyện trả phí">
            <ul className="mt-2 space-y-1 text-sm text-zinc-400">
              <li>
                Chia sẻ tác giả: {config.revenueSharePaidChapterCreatorPercent}% (mặc định hệ
                thống)
              </li>
              <li>
                Giá chương: {config.paidChapterMinCoinPrice}–{config.paidChapterMaxCoinPrice}{" "}
                {config.coinDisplayName}
              </li>
              <li>Giữ sau hoàn thành truyện: theo chính sách trọn bộ</li>
            </ul>
          </PolicyBlock>

          <PolicyBlock title="Tip / ủng hộ">
            <ul className="mt-2 space-y-1 text-sm text-zinc-400">
              <li>
                Chia sẻ tác giả: {config.revenueShareTipCreatorPercent}%
                {config.tipsEnabled ? "" : " (đang tắt)"}
              </li>
            </ul>
          </PolicyBlock>

          {adPolicy ? (
            <PolicyBlock title="Chia sẻ doanh thu quảng cáo">
              <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                <li>Quỹ tác giả: {adPolicy.creator_pool_percent}%</li>
                <li>Giữ dự phòng: {adPolicy.reserve_percent}%</li>
                <li>Giữ {adPolicy.reserve_hold_days} ngày</li>
                <li>Chu kỳ: {payoutCycleLabel(adPolicy.payout_cycle)}</li>
                <li>Rút tối thiểu QC: {formatMonetizationVnd(adPolicy.min_payout_vnd)}</li>
              </ul>
              {adDashboard.policyUpdatedAt ? (
                <p className="mt-2 text-xs text-zinc-600">
                  Cập nhật:{" "}
                  {new Intl.DateTimeFormat("vi-VN").format(new Date(adDashboard.policyUpdatedAt))}
                </p>
              ) : null}
            </PolicyBlock>
          ) : null}

          <PolicyBlock title="Rút tiền">
            <ul className="mt-2 space-y-1 text-sm text-zinc-400">
              <li>Tối thiểu: {formatMonetizationVnd(config.minWithdrawAmountVnd)}</li>
              <li>Xử lý: {config.payoutProcessingDaysLabel}</li>
              <li>
                KYC: {config.payoutKycRequired ? "Bắt buộc" : "Theo cấu hình"}
              </li>
            </ul>
          </PolicyBlock>
        </div>

        {config.policyText ? (
          <details className="mt-4 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium text-zinc-300">
              Ghi chú kiếm tiền nền tảng
            </summary>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-500">
              {config.policyText}
            </p>
          </details>
        ) : null}

        <p className="mt-4 text-sm">
          <Link className="font-semibold text-cyan-300 hover:text-cyan-200" href="/chinh-sach">
            Xem bản chính sách công khai →
          </Link>
        </p>
      </section>

      {revenuePolicy ? <CreatorRevenuePolicySection policy={revenuePolicy} /> : null}

      <CreatorAdRevenuePolicyCard dashboard={adDashboard} />
    </div>
  );
}

function PolicyBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h3>
      {children}
    </div>
  );
}
