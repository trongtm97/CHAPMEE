"use client";

import type { ContentQualityMonetizationImpactSummary } from "@/types/content-quality";
import { MONETIZATION_STATUS_LABELS } from "@/lib/admin/quality-refund-constants";

type StudioContentQualityAlertsProps = {
  impact: ContentQualityMonetizationImpactSummary | null | undefined;
};

export function StudioContentQualityAlerts({ impact }: StudioContentQualityAlertsProps) {
  if (!impact) return null;

  const isFreeDueToQuality = impact.monetizationStatus === "free_due_to_quality";
  const hasRefunds = impact.totalCoinRefunded > 0 || impact.completedRefundBatchCount > 0;

  if (!isFreeDueToQuality && !hasRefunds) return null;

  const statusLabel =
    MONETIZATION_STATUS_LABELS[impact.monetizationStatus] ?? impact.monetizationStatus;

  return (
    <section className="mb-4 space-y-3 rounded-xl border border-rose-400/30 bg-rose-400/5 p-4">
      <h3 className="text-sm font-bold text-rose-100">Tác động tài chính do chất lượng</h3>
      <p className="text-sm leading-6 text-rose-100/90">
        Do nội dung bị đánh giá chất lượng thấp, ChapMee đã{" "}
        {isFreeDueToQuality ? "mở miễn phí" : null}
        {isFreeDueToQuality && hasRefunds ? " và " : null}
        {hasRefunds ? "hoàn coin cho người mua" : null} theo chính sách nền tảng.
      </p>
      <ul className="space-y-1 text-sm text-rose-100/80">
        <li>Trạng thái kiếm tiền: {statusLabel}</li>
        {hasRefunds ? (
          <>
            <li>Người được hoàn: {impact.buyerCount > 0 ? "xem batch gần nhất" : "—"}</li>
            <li>Tổng coin đã hoàn: {impact.totalCoinRefunded.toLocaleString("vi-VN")}</li>
          </>
        ) : null}
        {impact.creatorRevenueVnd > 0 ? (
          <li>
            Doanh thu liên quan (NET): {impact.creatorRevenueVnd.toLocaleString("vi-VN")} ₫ — có
            thể đã bị điều chỉnh nếu đã hoàn coin.
          </li>
        ) : null}
      </ul>
      {impact.authorNote ? (
        <p className="text-sm text-zinc-300">
          <span className="font-medium text-zinc-200">Ghi chú từ ChapMee: </span>
          {impact.authorNote}
        </p>
      ) : null}
      {impact.freeAccessSetAt ? (
        <p className="text-xs text-zinc-500">
          Cập nhật: {new Date(impact.freeAccessSetAt).toLocaleString("vi-VN")}
        </p>
      ) : null}
    </section>
  );
}
