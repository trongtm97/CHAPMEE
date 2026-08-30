import Link from "next/link";

export function VatCalculatorSeoContent() {
  return (
    <section
      aria-labelledby="vat-calculator-seo"
      className="mt-6 space-y-4 border-t border-white/10 pt-6 text-sm leading-relaxed text-zinc-400"
    >
      <h2 className="text-base font-bold text-zinc-100" id="vat-calculator-seo">
        Công cụ tính thuế VAT trên ChapMee
      </h2>
      <p>
        ChapMee cung cấp <strong className="font-semibold text-zinc-200">Công Cụ Tính Thuế VAT</strong> miễn phí, chạy
        hoàn toàn trên trình duyệt — không gửi số tiền hay dữ liệu tài chính lên server. Bạn nhập số tiền, chọn thuế
        suất và phương thức tính để nhận ngay kết quả tiền trước thuế, tiền VAT và tiền sau thuế.
      </p>
      <p>
        Công cụ hỗ trợ tính xuôi (từ giá chưa VAT) và tính ngược (từ giá đã có VAT), với các mức thuế suất phổ biến 0%,
        5%, 8%, 10% hoặc nhập tùy chỉnh. Kết quả chỉ mang tính tham khảo, không thay thế tư vấn thuế hoặc kế toán chuyên
        môn.
      </p>
      <h3 className="text-sm font-bold text-zinc-200">Cách dùng nhanh</h3>
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>Nhập số tiền cần tính (chấp nhận định dạng 10.000.000, 10,000,000 hoặc 10.000.000đ).</li>
        <li>Chọn thuế suất VAT hoặc nhập mức tùy chỉnh.</li>
        <li>Chọn tính xuôi hoặc tính ngược tùy theo số tiền bạn đang có.</li>
        <li>Bấm &ldquo;Tính VAT&rdquo; và sao chép kết quả nếu cần.</li>
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
