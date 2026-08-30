import type { Metadata } from "next";
import { TdeeCalculator } from "@/components/utilities/TdeeCalculator";
import { TdeeCalculatorSeoContent } from "@/components/utilities/TdeeCalculatorSeoContent";
import { UtilitiesToolShell } from "@/components/utilities/UtilitiesToolShell";
import { metadataForStaticRoute } from "@/lib/seo/public-page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForStaticRoute({
    path: "/tien-ich/tinh-tdee",
    pageType: "static",
    fallbackTitle: "Công Cụ Tính TDEE — BMR, Calo Duy Trì Online Miễn Phí | ChapMee",
    fallbackDescription:
      "Tính BMR, TDEE, calo duy trì, calo giảm cân, calo tăng cân và macro tham khảo — miễn phí, chạy trên trình duyệt, không lưu dữ liệu.",
    indexableOverride: true,
    followOverride: true
  });
}

export default function TdeeCalculatorPage() {
  return (
    <UtilitiesToolShell>
      <TdeeCalculator />
      <div className="shrink-0 border-t border-white/10 px-0.5 pb-2 pt-4">
        <TdeeCalculatorSeoContent />
      </div>
    </UtilitiesToolShell>
  );
}
