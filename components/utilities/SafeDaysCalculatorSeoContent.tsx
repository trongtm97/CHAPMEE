import Link from "next/link";

export function SafeDaysCalculatorSeoContent() {
  return (
    <section
      aria-labelledby="safe-days-calculator-seo"
      className="mt-6 space-y-4 border-t border-white/10 pt-6 text-sm leading-relaxed text-zinc-400"
    >
      <h2 className="text-base font-bold text-zinc-100" id="safe-days-calculator-seo">
        Công cụ tính ngày quan hệ an toàn trên ChapMee
      </h2>
      <p>
        ChapMee cung cấp công cụ{" "}
        <strong className="font-semibold text-zinc-200">Tính Ngày Quan Hệ An Toàn</strong> miễn phí, chạy hoàn toàn
        trên trình duyệt — không gửi ngày kinh hay dữ liệu sức khỏe lên server. Bạn nhập ngày bắt đầu kỳ kinh gần
        nhất và độ dài chu kỳ để ước tính ngày rụng trứng, khoảng dễ thụ thai và những ngày ít khả năng thụ thai hơn.
      </p>
      <p>
        Công cụ phù hợp để theo dõi chu kỳ kinh nguyệt hoặc tham khảo nhanh. Kết quả chỉ mang tính ước tính, không
        có ngày nào an toàn tuyệt đối và không thay thế biện pháp tránh thai hoặc tư vấn y tế chuyên môn.
      </p>
      <h3 className="text-sm font-bold text-zinc-200">Cách dùng nhanh</h3>
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>Chọn ngày đầu tiên của kỳ kinh gần nhất.</li>
        <li>Nhập độ dài chu kỳ và số ngày hành kinh (nếu có).</li>
        <li>Bấm &ldquo;Tính ngày&rdquo; để xem kết quả, lịch minh họa và dự đoán nhiều chu kỳ.</li>
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
