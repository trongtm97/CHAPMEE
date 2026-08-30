import type { Metadata } from "next";
import { SafeDaysCalculator } from "@/components/utilities/SafeDaysCalculator";
import { SafeDaysCalculatorSeoContent } from "@/components/utilities/SafeDaysCalculatorSeoContent";
import { UtilitiesToolShell } from "@/components/utilities/UtilitiesToolShell";
import { metadataForStaticRoute } from "@/lib/seo/public-page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForStaticRoute({
    path: "/tien-ich/tinh-ngay-quan-he-an-toan",
    pageType: "static",
    fallbackTitle: "Tính Ngày Quan Hệ An Toàn — Ước Tính Ngày Rụng Trứng | ChapMee",
    fallbackDescription:
      "Ước tính ngày rụng trứng, khoảng dễ thụ thai và ngày ít khả năng thụ thai dựa trên chu kỳ kinh nguyệt. Miễn phí, chạy trên trình duyệt, không lưu dữ liệu.",
    indexableOverride: true,
    followOverride: true
  });
}

export default function SafeDaysCalculatorPage() {
  return (
    <UtilitiesToolShell>
      <SafeDaysCalculator />
      <div className="shrink-0 border-t border-white/10 px-0.5 pb-2 pt-4">
        <SafeDaysCalculatorSeoContent />
      </div>
    </UtilitiesToolShell>
  );
}
