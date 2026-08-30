import type { Metadata } from "next";
import { PercentCalculator } from "@/components/utilities/PercentCalculator";
import { PercentCalculatorSeoContent } from "@/components/utilities/PercentCalculatorSeoContent";
import { UtilitiesToolShell } from "@/components/utilities/UtilitiesToolShell";
import { metadataForStaticRoute } from "@/lib/seo/public-page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForStaticRoute({
    path: "/tien-ich/tinh-phan-tram",
    pageType: "static",
    fallbackTitle: "Công Cụ Tính Phần Trăm Online Miễn Phí | ChapMee",
    fallbackDescription:
      "Tính phần trăm nhanh: % của một số, tỷ lệ %, tăng/giảm %, phần trăm thay đổi, giá sau giảm giá và tìm giá gốc. Miễn phí, chạy trên trình duyệt.",
    indexableOverride: true,
    followOverride: true
  });
}

export default function PercentCalculatorPage() {
  return (
    <UtilitiesToolShell>
      <PercentCalculator />
      <div className="shrink-0 border-t border-white/10 px-0.5 pb-2 pt-4">
        <PercentCalculatorSeoContent />
      </div>
    </UtilitiesToolShell>
  );
}
