import type { Metadata } from "next";
import { VatCalculator } from "@/components/utilities/VatCalculator";
import { VatCalculatorSeoContent } from "@/components/utilities/VatCalculatorSeoContent";
import { UtilitiesToolShell } from "@/components/utilities/UtilitiesToolShell";
import { metadataForStaticRoute } from "@/lib/seo/public-page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForStaticRoute({
    path: "/tien-ich/tinh-thue-vat",
    pageType: "static",
    fallbackTitle: "Công Cụ Tính Thuế VAT Online Miễn Phí | ChapMee",
    fallbackDescription:
      "Tính thuế VAT nhanh theo 2 chiều: từ giá chưa VAT ra giá sau VAT, hoặc tách ngược từ giá đã có VAT. Hỗ trợ 0%, 5%, 8%, 10% và thuế suất tùy chỉnh — miễn phí, chạy trên trình duyệt.",
    indexableOverride: true,
    followOverride: true
  });
}

export default function VatCalculatorPage() {
  return (
    <UtilitiesToolShell>
      <VatCalculator />
      <div className="shrink-0 border-t border-white/10 px-0.5 pb-2 pt-4">
        <VatCalculatorSeoContent />
      </div>
    </UtilitiesToolShell>
  );
}
