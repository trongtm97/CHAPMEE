import Link from "next/link";

export function InterestCalculatorSeoContent() {
  return (
    <section
      aria-labelledby="interest-calculator-seo"
      className="mt-6 space-y-4 border-t border-white/10 pt-6 text-sm leading-relaxed text-zinc-400"
    >
      <h2 className="text-base font-bold text-zinc-100" id="interest-calculator-seo">
        Công cụ tính lãi trên ChapMee
      </h2>
      <p>
        ChapMee cung cấp <strong className="font-semibold text-zinc-200">Công cụ tính lãi</strong> miễn phí, chạy hoàn
        toàn trên trình duyệt — không gửi số tiền hay lãi suất lên server, không lưu dữ liệu tài chính của bạn. Bạn
        nhập số liệu và nhận ngay kết quả tổng tiền, tiền lãi dự kiến cùng bảng chi tiết theo thời gian.
      </p>
      <p>
        Công cụ hỗ trợ ba chế độ: tính lãi suất kép (có thể góp thêm định kỳ), tính lãi tiết kiệm ngân hàng và tính
        lãi vay (trả góp đều, dư nợ giảm dần, trả lãi hàng tháng gốc cuối kỳ). Kết quả chỉ mang tính tham khảo, không
        phải tư vấn tài chính.
      </p>
      <h3 className="text-sm font-bold text-zinc-200">Cách dùng nhanh</h3>
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>Chọn tab &ldquo;Lãi suất kép&rdquo;, &ldquo;Lãi tiết kiệm&rdquo; hoặc &ldquo;Lãi vay&rdquo;.</li>
        <li>Nhập số tiền, lãi suất năm và thời gian/kỳ hạn.</li>
        <li>Bấm &ldquo;Tính lãi&rdquo; để xem kết quả và bảng chi tiết.</li>
        <li>Bấm &ldquo;Sao chép kết quả&rdquo; để lưu nhanh, hoặc &ldquo;Dán ví dụ mẫu&rdquo; để thử ngay.</li>
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
