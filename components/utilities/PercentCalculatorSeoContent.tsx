import Link from "next/link";

export function PercentCalculatorSeoContent() {
  return (
    <section
      aria-labelledby="percent-calculator-seo"
      className="mt-6 space-y-4 border-t border-white/10 pt-6 text-sm leading-relaxed text-zinc-400"
    >
      <h2 className="text-base font-bold text-zinc-100" id="percent-calculator-seo">
        Công cụ tính phần trăm trên ChapMee
      </h2>
      <p>
        ChapMee cung cấp tiện ích <strong className="font-semibold text-zinc-200">Tính Phần Trăm</strong> miễn phí,
        chạy hoàn toàn trên trình duyệt — không gửi dữ liệu lên server. Bạn có thể tính % của một số, tỷ lệ phần trăm,
        tăng/giảm %, phần trăm thay đổi, giá sau giảm giá và tìm giá gốc trước khi giảm.
      </p>
      <p>
        Công cụ hỗ trợ nhập số linh hoạt (1.000.000, 10%, 1.000.000đ) và hiển thị kết quả theo định dạng tiếng Việt.
        Phù hợp cho bán hàng online, marketing, kế toán và tính khuyến mãi nhanh.
      </p>
      <h3 className="text-sm font-bold text-zinc-200">Cách dùng nhanh</h3>
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>Chọn tab tính toán phù hợp (tính %, tỷ lệ %, tăng/giảm, v.v.).</li>
        <li>Nhập các giá trị vào ô tương ứng.</li>
        <li>Bấm &ldquo;Tính&rdquo; và sao chép kết quả nếu cần.</li>
      </ol>
      <p>
        Tiện ích nằm trong mục{" "}
        <Link className="font-semibold text-cyan-200 hover:text-cyan-100" href="/tien-ich">
          Tiện ích ChapMee
        </Link>
        . Bạn cũng có thể vào từ{" "}
        <Link className="font-semibold text-cyan-200 hover:text-cyan-100" href="/discover">
          Khám phá
        </Link>
        .
      </p>
    </section>
  );
}
