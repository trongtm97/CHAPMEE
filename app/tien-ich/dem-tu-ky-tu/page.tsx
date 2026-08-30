import type { Metadata } from "next";
import { TextCounter } from "@/components/utilities/TextCounter";
import { TextCounterSeoContent } from "@/components/utilities/TextCounterSeoContent";
import { UtilitiesToolShell } from "@/components/utilities/UtilitiesToolShell";
import { metadataForStaticRoute } from "@/lib/seo/public-page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForStaticRoute({
    path: "/tien-ich/dem-tu-ky-tu",
    pageType: "static",
    fallbackTitle: "Đếm Từ / Ký Tự Online Miễn Phí | ChapMee",
    fallbackDescription:
      "Đếm số từ, ký tự, câu, dòng, đoạn văn và ước tính thời gian đọc — công cụ miễn phí, chạy trên trình duyệt, không lưu dữ liệu.",
    indexableOverride: true,
    followOverride: true
  });
}

export default function TextCounterPage() {
  return (
    <UtilitiesToolShell>
      <TextCounter />
      <div className="shrink-0 border-t border-white/10 px-0.5 pb-2 pt-4">
        <TextCounterSeoContent />
      </div>
    </UtilitiesToolShell>
  );
}
