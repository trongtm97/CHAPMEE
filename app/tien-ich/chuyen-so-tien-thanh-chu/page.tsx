import type { Metadata } from "next";
import { NumberToWordsVn } from "@/components/utilities/NumberToWordsVn";
import { NumberToWordsVnSeoContent } from "@/components/utilities/NumberToWordsVnSeoContent";
import { UtilitiesToolShell } from "@/components/utilities/UtilitiesToolShell";
import { metadataForStaticRoute } from "@/lib/seo/public-page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForStaticRoute({
    path: "/tien-ich/chuyen-so-tien-thanh-chu",
    pageType: "static",
    fallbackTitle: "Chuyển Số Tiền Thành Chữ Online Miễn Phí | ChapMee",
    fallbackDescription:
      "Chuyển số tiền sang chữ tiếng Việt nhanh — dùng cho hợp đồng, hóa đơn, phiếu thu/chi. Ba định dạng kết quả, sao chép một click, chạy trên trình duyệt.",
    indexableOverride: true,
    followOverride: true
  });
}

export default function NumberToWordsVnPage() {
  return (
    <UtilitiesToolShell>
      <NumberToWordsVn />
      <div className="shrink-0 border-t border-white/10 px-0.5 pb-2 pt-4">
        <NumberToWordsVnSeoContent />
      </div>
    </UtilitiesToolShell>
  );
}
