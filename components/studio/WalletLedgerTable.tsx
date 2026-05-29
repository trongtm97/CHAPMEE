import type { CreatorWalletLedgerRow } from "@/types/finance";

const TYPE_LABELS: Record<string, string> = {
  chapter_unlock_revenue: "Doanh thu mở khóa chương",
  story_unlock_revenue: "Doanh thu mở khóa truyện",
  tip_revenue: "Tip",
  bonus: "Bonus",
  adjustment: "Điều chỉnh",
  withdrawal_hold: "Giữ rút tiền",
  withdrawal_paid: "Đã thanh toán rút",
  withdrawal_refund: "Hoàn giữ rút",
  penalty_hold: "Giữ phạt",
  penalty_release: "Giải phóng phạt"
};

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} ₫`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("vi-VN");
}

type WalletLedgerTableProps = {
  rows: CreatorWalletLedgerRow[];
};

export function WalletLedgerTable({ rows }: WalletLedgerTableProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4 sm:p-5">
      <h2 className="text-base font-bold text-white">Sổ cái ví (bất biến)</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Mọi thay đổi số dư quan trọng được ghi thêm — không chỉnh sửa bản ghi cũ.
      </p>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">
          Chưa có bút toán sổ cái. Doanh thu chi tiết xem ở bảng Doanh thu; bút toán giữ tiền rút
          sẽ xuất hiện khi bạn gửi yêu cầu rút.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs text-zinc-500">
                <th className="pb-2 pr-3">Thời gian</th>
                <th className="pb-2 pr-3">Loại</th>
                <th className="pb-2 pr-3">Chiều</th>
                <th className="pb-2 pr-3 text-right">Số tiền</th>
                <th className="pb-2">Mô tả</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-white/5 text-zinc-200">
                  <td className="py-2 pr-3 text-xs text-zinc-400">{formatDate(row.created_at)}</td>
                  <td className="py-2 pr-3">{TYPE_LABELS[row.type] ?? row.type}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={
                        row.direction === "credit" ? "text-emerald-300" : "text-amber-300"
                      }
                    >
                      {row.direction === "credit" ? "Cộng" : "Trừ"}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-right font-medium">{formatVnd(row.amount_vnd)}</td>
                  <td className="py-2 text-xs text-zinc-400">{row.description ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
