import { formatAdRevenueDate, formatAdRevenueVnd } from "@/components/studio/ads-revenue/format";
import type { CreatorAdRevenueDashboard } from "@/types/creator-ad-revenue-dashboard";
import type { CreatorReconciledAdRevenueMonth } from "@/types/ad-revenue-reconciliation";
import { CREATOR_AD_PAYOUT_CYCLE_LABELS } from "@/types/creator-ad-revenue-policy";

function allocationStatusLabel(row: CreatorReconciledAdRevenueMonth) {
  if (row.displayStatus === "under_review") {
    return {
      text: "Đang giữ để kiểm tra",
      className: "bg-amber-500/15 text-amber-200"
    };
  }
  if (row.displayStatus === "cancelled") {
    return {
      text: "Không tính thanh toán",
      className: "bg-zinc-500/20 text-zinc-400"
    };
  }
  if (row.allocationStatus === "payable") {
    return {
      text: "Có thể thanh toán",
      className: "bg-emerald-500/15 text-emerald-200"
    };
  }
  return {
    text: "Đã đối soát",
    className: "bg-cyan-500/15 text-cyan-200"
  };
}

type CreatorAdRevenueHistoryTableProps = {
  dashboard: CreatorAdRevenueDashboard;
};

export function CreatorAdRevenueHistoryTable({ dashboard }: CreatorAdRevenueHistoryTableProps) {
  const { history, sharing } = dashboard;
  const payoutWindowLabel =
    CREATOR_AD_PAYOUT_CYCLE_LABELS[sharing.policy.payout_cycle] ?? sharing.policy.payout_cycle;

  const rows = history.reconciledMonths;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Doanh thu đã đối soát</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Số liệu sau khi ChapMee khóa kỳ từ doanh thu đối tác quảng cáo hợp lệ — tách biệt với
          ước tính RPM. ChapMee đối soát và chi trả theo chính sách; không cộng vào số dư ví tự
          động.
        </p>
        {payoutWindowLabel ? (
          <p className="mt-2 text-xs text-zinc-500">
            Cửa sổ thanh toán tham chiếu: {payoutWindowLabel}. Chỉ thanh toán khi đủ điều kiện.
          </p>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Chưa có tháng nào được ChapMee đối soát và khóa kỳ cho tài khoản của bạn.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">Tháng</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2">Final payable</th>
                <th className="px-3 py-2">Giữ dự phòng</th>
                <th className="px-3 py-2">Mở dự phòng (dự kiến)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const badge = allocationStatusLabel(row);
                return (
                  <tr key={row.month} className="border-t border-white/5 text-zinc-300">
                    <td className="px-3 py-2 font-medium text-zinc-200">{row.month}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs ${badge.className}`}
                      >
                        {badge.text}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium text-white">
                      {formatAdRevenueVnd(row.finalPayableVnd)}
                    </td>
                    <td className="px-3 py-2">{formatAdRevenueVnd(row.reserveHoldVnd)}</td>
                    <td className="px-3 py-2 text-zinc-400">
                      {formatAdRevenueDate(row.reserveReleaseAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.some((r) => r.displayStatus === "under_review") ? (
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm text-amber-100/90">
          Một hoặc nhiều khoản đang được giữ để kiểm tra trước khi thanh toán. Đây không phải
          lỗi hệ thống và không có nghĩa bạn chắc chắn nhận số tiền ước tính.
        </p>
      ) : null}

      {rows
        .filter((r) => r.statusMessage && r.displayStatus !== "paid_track")
        .map((r) => (
          <p
            key={`hold-msg-${r.month}`}
            className="text-sm text-amber-100/80"
          >
            {r.month}: {r.statusMessage}
          </p>
        ))}
    </section>
  );
}
