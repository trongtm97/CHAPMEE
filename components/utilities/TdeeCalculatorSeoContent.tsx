import Link from "next/link";

export function TdeeCalculatorSeoContent() {
  return (
    <section
      aria-labelledby="tdee-calculator-seo"
      className="mt-6 space-y-4 border-t border-white/10 pt-6 text-sm leading-relaxed text-zinc-400"
    >
      <h2 className="text-base font-bold text-zinc-100" id="tdee-calculator-seo">
        Công cụ tính TDEE trên ChapMee
      </h2>
      <p>
        ChapMee cung cấp công cụ <strong className="font-semibold text-zinc-200">Tính TDEE</strong> miễn phí, chạy
        hoàn toàn trên trình duyệt — không gửi cân nặng, chiều cao, tuổi hay giới tính lên server. Bạn nhập thông tin
        cơ bản và nhận ngay ước tính BMR, TDEE, calo duy trì, calo giảm/tăng cân và macro tham khảo.
      </p>
      <p>
        Công cụ phù hợp cho người theo dõi calo, tập gym hoặc muốn tham khảo nhu cầu năng lượng hằng ngày. Kết quả chỉ
        mang tính tham khảo, không thay thế tư vấn y tế hoặc dinh dưỡng cá nhân hóa.
      </p>
      <h3 className="text-sm font-bold text-zinc-200">Cách dùng nhanh</h3>
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>Chọn giới tính, nhập tuổi, chiều cao và cân nặng.</li>
        <li>Chọn mức vận động và mục tiêu (giữ cân, giảm cân hoặc tăng cân).</li>
        <li>Bấm &ldquo;Tính TDEE&rdquo; để xem kết quả và macro tham khảo.</li>
      </ol>
      <p>
        Tiện ích nằm trong mục{" "}
        <Link className="font-semibold text-cyan-200 hover:text-cyan-100" href="/tien-ich">
          Tiện ích ChapMee
        </Link>
        . Bạn cũng có thể thử{" "}
        <Link className="font-semibold text-cyan-200 hover:text-cyan-100" href="/tien-ich/tinh-bmi">
          Tính BMI
        </Link>{" "}
        hoặc vào từ{" "}
        <Link className="font-semibold text-cyan-200 hover:text-cyan-100" href="/discover">
          Khám phá
        </Link>
        .
      </p>
    </section>
  );
}
