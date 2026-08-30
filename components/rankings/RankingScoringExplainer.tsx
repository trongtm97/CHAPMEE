import Link from "next/link";

const SIGNALS = [
  "Lượt đọc hợp lệ",
  "Đọc tiếp chương",
  "Lưu truyện",
  "Tương tác cộng đồng",
  "Đề cử từ độc giả",
  "Chống gian lận & spam"
] as const;

const BOOSTED_SIGNALS = [
  "Tổng Phiếu đề cử",
  "Nhiều người ủng hộ",
  "Cập nhật theo thời gian"
] as const;

type RankingScoringExplainerProps = {
  variant?: "default" | "boosted";
};

export function RankingScoringExplainer({ variant = "default" }: RankingScoringExplainerProps) {
  const isBoosted = variant === "boosted";
  const signals = isBoosted ? BOOSTED_SIGNALS : SIGNALS;

  return (
    <aside className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
      <h2 className="text-sm font-bold text-zinc-200">Cách tính bảng này</h2>
      <p className="mt-1.5 text-sm leading-6 text-zinc-400">
        {isBoosted
          ? "Xếp hạng theo tổng Phiếu đề cử mà truyện nhận được từ độc giả — đơn giản và minh bạch."
          : "Điểm xếp hạng tổng hợp các tín hiệu sau — không chỉ dựa vào một chỉ số duy nhất:"}
      </p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {signals.map((signal) => (
          <li key={signal}>
            <span className="inline-block rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-zinc-300">
              {signal}
            </span>
          </li>
        ))}
      </ul>
      {!isBoosted ? (
        <p className="mt-2.5 text-xs leading-5 text-zinc-500">
          Điểm có thể được điều chỉnh để chống spam và đảm bảo công bằng hiển thị.
        </p>
      ) : null}
      <p className="mt-2 text-sm">
        <Link className="font-semibold text-cyan-200 hover:underline" href="/content-policy">
          Xem chi tiết chính sách
        </Link>
      </p>
    </aside>
  );
}
