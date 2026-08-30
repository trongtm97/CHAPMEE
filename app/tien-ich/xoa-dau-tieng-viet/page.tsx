import type { Metadata } from "next";
import { VietnameseToneRemover } from "@/components/utilities/VietnameseToneRemover";
import { VietnameseToneRemoverSeoContent } from "@/components/utilities/VietnameseToneRemoverSeoContent";
import { UtilitiesToolShell } from "@/components/utilities/UtilitiesToolShell";
import { metadataForStaticRoute } from "@/lib/seo/public-page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForStaticRoute({
    path: "/tien-ich/xoa-dau-tieng-viet",
    pageType: "static",
    fallbackTitle: "Xóa Dấu Tiếng Việt Online Miễn Phí | ChapMee",
    fallbackDescription:
      "Chuyển tiếng Việt có dấu sang không dấu nhanh, tạo slug SEO, đổi chữ hoa/thường và sao chép kết quả — công cụ miễn phí, chạy trên trình duyệt.",
    indexableOverride: true,
    followOverride: true
  });
}

export default function VietnameseToneRemoverPage() {
  return (
    <UtilitiesToolShell>
      <VietnameseToneRemover />
      <div className="shrink-0 border-t border-white/10 px-0.5 pb-2 pt-4">
        <VietnameseToneRemoverSeoContent />
      </div>
    </UtilitiesToolShell>
  );
}
