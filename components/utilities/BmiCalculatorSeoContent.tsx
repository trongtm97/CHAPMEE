import Link from "next/link";

export function BmiCalculatorSeoContent() {
  return (
    <section
      aria-labelledby="bmi-calculator-seo"
      className="mt-6 space-y-4 border-t border-white/10 pt-6 text-sm leading-relaxed text-zinc-400"
    >
      <h2 className="text-base font-bold text-zinc-100" id="bmi-calculator-seo">
        Công cụ tính BMI trên ChapMee
      </h2>
      <p>
        ChapMee cung cấp công cụ <strong className="font-semibold text-zinc-200">Tính BMI — Chỉ Số Khối Cơ Thể</strong>{" "}
        miễn phí, chạy hoàn toàn trên trình duyệt — không gửi cân nặng hay chiều cao lên server. Bạn nhập số liệu và
        nhận ngay chỉ số BMI, phân loại cơ thể cùng khoảng cân nặng tham khảo theo chiều cao.
      </p>
      <p>
        Công cụ phù hợp để kiểm tra nhanh chỉ số khối cơ thể cho người trưởng thành. Kết quả chỉ mang tính tham khảo,
        không thay thế tư vấn y tế chuyên môn.
      </p>
      <h3 className="text-sm font-bold text-zinc-200">Cách dùng nhanh</h3>
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>Nhập cân nặng (kg) và chiều cao (cm) vào các ô tương ứng.</li>
        <li>Bấm &ldquo;Tính BMI&rdquo; để xem chỉ số, phân loại và gợi ý.</li>
        <li>Bấm &ldquo;Sao chép kết quả&rdquo; để lưu nhanh, hoặc &ldquo;Xóa để nhập mới&rdquo; để nhập lại.</li>
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
