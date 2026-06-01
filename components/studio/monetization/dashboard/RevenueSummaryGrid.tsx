import { formatMonetizationVnd } from "@/lib/studio/format-monetization-display";
import { RevenueMetricCard } from "@/components/studio/monetization/dashboard/RevenueMetricCard";
import type { StudioAdRevenueSummaryView } from "@/types/studio-monetization-dashboard";
import type {
  StudioMonetizationConfigView,
  StudioMonetizationOverview
} from "@/types/studio-monetization";

type RevenueSummaryGridProps = {
  overview: StudioMonetizationOverview;
  config: StudioMonetizationConfigView;
  adSummary: StudioAdRevenueSummaryView;
  showMoneyAmounts: boolean;
};

function money(
  value: number,
  show: boolean,
  emptyWhenZero?: string
): { value: string; muted: boolean } {
  if (!show) return { value: "—", muted: true };
  if (value === 0 && emptyWhenZero) {
    return { value: emptyWhenZero, muted: true };
  }
  return { value: formatMonetizationVnd(value), muted: value === 0 };
}

export function RevenueSummaryGrid({
  overview,
  config,
  adSummary,
  showMoneyAmounts
}: RevenueSummaryGridProps) {
  const available = money(
    overview.availableRevenueVnd,
    showMoneyAmounts,
    overview.hasWallet ? undefined : "Chưa có ví"
  );
  const pending = money(
    overview.pendingRevenueVnd,
    showMoneyAmounts,
    "Bạn chưa có giao dịch chờ đối soát"
  );
  const locked = money(overview.lockedRevenueVnd, showMoneyAmounts);
  const withdrawn = money(overview.totalWithdrawnVnd, showMoneyAmounts, "Chưa rút tiền");
  const paidStories = money(
    overview.paidUnlockRevenueVnd,
    showMoneyAmounts,
    "Chưa có doanh thu truyện trả phí"
  );
  const tips = money(
    overview.tipsReceivedVnd,
    showMoneyAmounts,
    config.tipsEnabled ? "Chưa có tip" : "Tip đang tắt"
  );
  const adEstimated = money(
    adSummary.estimatedCurrentMonthVnd ?? 0,
    showMoneyAmounts && adSummary.estimatesVisible,
    "Doanh thu quảng cáo sẽ xuất hiện sau khi có dữ liệu QC hợp lệ."
  );
  const adFinalized = money(
    adSummary.finalizedTotalVnd,
    showMoneyAmounts,
    "Chưa có doanh thu quảng cáo đã chốt"
  );

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-white">Tổng quan doanh thu</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Doanh thu truyện/tip và quảng cáo hiển thị riêng. Số quảng cáo ước tính không cộng vào số
          có thể rút.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <RevenueMetricCard
          hint="Số dư ví tác giả — chỉ gồm doanh thu đã đối soát (truyện, tip…)."
          label="Có thể rút"
          muted={available.muted}
          tone="green"
          value={available.value}
        />
        <RevenueMetricCard
          hint="Đang chờ xử lý hoặc đối soát nội bộ."
          label="Chờ đối soát"
          muted={pending.muted}
          tone="blue"
          value={pending.value}
        />
        <RevenueMetricCard
          hint="Doanh thu tạm giữ (không gồm trọn bộ chờ admin nếu đã tách)."
          label="Giữ dự phòng"
          muted={locked.muted}
          tone="amber"
          value={locked.value}
        />
        <RevenueMetricCard
          hint="Tổng đã rút thành công."
          label="Đã rút"
          muted={withdrawn.muted}
          tone="slate"
          value={withdrawn.value}
        />
        <RevenueMetricCard
          hint="Mở khóa chương và mua trọn bộ."
          label="Truyện trả phí"
          muted={paidStories.muted}
          tone="cyan"
          value={paidStories.value}
        />
        <RevenueMetricCard
          hint="Ủng hộ từ độc giả."
          label="Tip / ủng hộ"
          muted={tips.muted}
          tone="rose"
          value={tips.value}
        />
        <RevenueMetricCard
          hint="Chỉ mang tính tham khảo — không phải số dư rút."
          label="QC ước tính (tháng)"
          muted={adEstimated.muted}
          tag="Ước tính"
          tone="amber"
          value={adEstimated.value}
        />
        <RevenueMetricCard
          hint="Đã đối soát — vẫn có thể bị giữ dự phòng theo chính sách."
          label="QC đã chốt"
          muted={adFinalized.muted}
          tone="purple"
          value={adFinalized.value}
        />
      </div>

      {overview.lockedFullStoryRevenueVnd > 0 ? (
        <p className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm leading-relaxed text-amber-50">
          {formatMonetizationVnd(overview.lockedFullStoryRevenueVnd)} doanh thu trọn bộ đang giữ
          chờ admin xác nhận hoàn thành truyện.
        </p>
      ) : null}
    </div>
  );
}
