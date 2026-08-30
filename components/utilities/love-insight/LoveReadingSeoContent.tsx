import Link from "next/link";

export function LoveReadingSeoContent() {
  return (
    <section
      aria-labelledby="love-reading-seo"
      className="mt-6 space-y-4 border-t border-white/10 pt-6 text-sm leading-relaxed text-zinc-400"
    >
      <h2 className="text-base font-bold text-zinc-100" id="love-reading-seo">
        Bói tình yêu trên ChapMee
      </h2>
      <p>
        Tiện ích <strong className="font-semibold text-zinc-200">Bói tình yêu</strong> giúp bạn khám phá
        mức độ hợp nhau giữa hai người theo tên và (tuỳ chọn) ngày sinh. Hệ thống phân tích nhiều lớp dữ
        liệu: thần số học, âm thanh học tên, ý nghĩa tên tiếng Việt, cung hoàng đạo, con giáp và ngũ
        hành.
      </p>
      <p>
        Kết quả là <strong className="font-semibold text-zinc-200">deterministic</strong> — cùng thông tin
        nhập vào sẽ luôn cho cùng điểm số, không dùng random. Miễn phí, không cần đăng nhập.
      </p>
      <h3 className="text-sm font-bold text-zinc-200">Cách dùng</h3>
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>Nhập họ tên hai người (bắt buộc).</li>
        <li>Tuỳ chọn thêm ngày sinh cả hai để phân tích sâu hơn.</li>
        <li>Chọn trạng thái quan hệ và chế độ chia sẻ, rồi bấm Xem kết quả.</li>
        <li>Sao chép link chia sẻ nếu muốn gửi cho bạn bè.</li>
      </ol>
      <p>
        Xem thêm tiện ích khác tại{" "}
        <Link className="font-semibold text-cyan-200 hover:text-cyan-100" href="/tien-ich">
          mục Tiện ích
        </Link>
        .
      </p>
    </section>
  );
}
