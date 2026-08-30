import type { Metadata } from "next";
import { InterestCalculator } from "@/components/utilities/InterestCalculator";
import { InterestCalculatorSeoContent } from "@/components/utilities/InterestCalculatorSeoContent";
import { UtilitiesToolShell } from "@/components/utilities/UtilitiesToolShell";
import { metadataForStaticRoute } from "@/lib/seo/public-page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForStaticRoute({
    path: "/tien-ich/tinh-lai-suat",
    pageType: "static",
    fallbackTitle: "Công cụ tính lãi Online Miễn Phí | ChapMee",
    fallbackDescription:
      "Tính lãi suất kép, lãi tiết kiệm và lãi vay — xem tổng tiền, lãi nhận được, lịch trả nợ theo tháng. Miễn phí, chạy trên trình duyệt, không lưu dữ liệu.",
    indexableOverride: true,
    followOverride: true
  });
}

export default function InterestCalculatorPage() {
  return (
    <UtilitiesToolShell>
      <InterestCalculator />
      <div className="shrink-0 border-t border-white/10 px-0.5 pb-2 pt-4">
        <InterestCalculatorSeoContent />
      </div>
    </UtilitiesToolShell>
  );
}
