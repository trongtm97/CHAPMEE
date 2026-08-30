import type { Metadata } from "next";
import { TextCaseConverter } from "@/components/utilities/TextCaseConverter";
import { TextCaseConverterSeoContent } from "@/components/utilities/TextCaseConverterSeoContent";
import { UtilitiesToolShell } from "@/components/utilities/UtilitiesToolShell";
import { metadataForStaticRoute } from "@/lib/seo/public-page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForStaticRoute({
    path: "/tien-ich/chuyen-chu-hoa-thuong",
    pageType: "static",
    fallbackTitle: "Chuyển Chữ Hoa / Thường Online Miễn Phí | ChapMee",
    fallbackDescription:
      "Chuyển đổi văn bản sang chữ hoa, chữ thường, viết hoa đầu câu, viết hoa mỗi từ — công cụ miễn phí, chạy trên trình duyệt, hỗ trợ tiếng Việt có dấu.",
    indexableOverride: true,
    followOverride: true
  });
}

export default function TextCaseConverterPage() {
  return (
    <UtilitiesToolShell>
      <TextCaseConverter />
      <div className="shrink-0 border-t border-white/10 px-0.5 pb-2 pt-4">
        <TextCaseConverterSeoContent />
      </div>
    </UtilitiesToolShell>
  );
}
