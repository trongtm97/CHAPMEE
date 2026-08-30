import type { Metadata } from "next";
import { BmiCalculator } from "@/components/utilities/BmiCalculator";
import { BmiCalculatorSeoContent } from "@/components/utilities/BmiCalculatorSeoContent";
import { UtilitiesToolShell } from "@/components/utilities/UtilitiesToolShell";
import { metadataForStaticRoute } from "@/lib/seo/public-page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForStaticRoute({
    path: "/tien-ich/tinh-bmi",
    pageType: "static",
    fallbackTitle: "Tính BMI — Chỉ Số Khối Cơ Thể Online Miễn Phí | ChapMee",
    fallbackDescription:
      "Tính chỉ số BMI từ cân nặng và chiều cao — xem phân loại cơ thể, khoảng cân nặng tham khảo. Miễn phí, chạy trên trình duyệt, không lưu dữ liệu.",
    indexableOverride: true,
    followOverride: true
  });
}

export default function BmiCalculatorPage() {
  return (
    <UtilitiesToolShell>
      <BmiCalculator />
      <div className="shrink-0 border-t border-white/10 px-0.5 pb-2 pt-4">
        <BmiCalculatorSeoContent />
      </div>
    </UtilitiesToolShell>
  );
}
