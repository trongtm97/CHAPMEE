import Link from "next/link";
import { formatRecommendationPoints, formatVnd } from "@/lib/format/money";
import { RecommendationTicketBalance } from "@/components/wallet/RecommendationTicketBalance";

type WalletFaqSectionProps = {
  ticketBalance: number;
};

const FAQ_ITEMS = [
  {
    title: "Xu là gì?",
    body: "1đ = 1 Xu. Xu dùng để mở chương, mua truyện và sử dụng các tính năng nội bộ."
  },
  {
    title: "Điểm đề cử là gì?",
    body: "Nạp tiền hợp lệ sẽ nhận điểm đề cử tương ứng theo đúng số tiền nạp. Xu bonus có thể không được tính vào điểm đề cử."
  },
  {
    title: "Thanh toán như thế nào?",
    body: "Chọn gói nạp, mở checkout và thanh toán qua SePay hoặc VietQR."
  }
];

export function WalletFaqSection({ ticketBalance }: WalletFaqSectionProps) {
  return (
    <div className="space-y-3 rounded-[1.75rem] border border-white/10 bg-white/[0.02] p-5">
      <div className="space-y-1">
        <p className="text-sm font-bold text-zinc-100">Thông tin thêm</p>
        <p className="text-sm text-zinc-500">
          Giữ gọn ở cuối trang để phần nạp Xu luôn là trọng tâm.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-300/15 bg-amber-300/8 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <RecommendationTicketBalance
            balance={ticketBalance}
            className="text-zinc-200"
            label="Phiếu đề cử hiện có"
          />
          <Link
            className="text-sm font-semibold text-amber-300 transition hover:text-amber-200"
            href="/bang-xep-hang/duoc-de-cu"
          >
            Xem bảng Được đề cử
          </Link>
        </div>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Nạp hợp lệ sẽ nhận điểm đề cử tương ứng. Ví dụ: {formatVnd(20_000)} nhận{" "}
          {formatRecommendationPoints(20_000)}.
        </p>
      </div>

      <div className="space-y-2.5">
        {FAQ_ITEMS.map((item) => (
          <details
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
            key={item.title}
          >
            <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-200 [&::-webkit-details-marker]:hidden">
              {item.title}
            </summary>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{item.body}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
