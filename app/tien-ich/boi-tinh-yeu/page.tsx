import type { Metadata } from "next";
import { LoveReadingCalculator } from "@/components/utilities/love-insight/LoveReadingCalculator";
import { LoveReadingSeoContent } from "@/components/utilities/love-insight/LoveReadingSeoContent";
import { UtilitiesToolShell } from "@/components/utilities/UtilitiesToolShell";
import { metadataForStaticRoute } from "@/lib/seo/public-page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForStaticRoute({
    path: "/tien-ich/boi-tinh-yeu",
    pageType: "static",
    fallbackTitle: "Bói Tình Yêu — Xem Mức Độ Hợp Nhau Online Miễn Phí | ChapMee",
    fallbackDescription:
      "Bói tình yêu theo tên và ngày sinh — thần số học, cung hoàng đạo, con giáp, ngũ hành. Miễn phí, deterministic, không cần đăng nhập.",
    indexableOverride: true,
    followOverride: true
  });
}

export default function LoveReadingPage() {
  return (
    <UtilitiesToolShell>
      <LoveReadingCalculator />
      <div className="shrink-0 border-t border-white/10 px-0.5 pb-2 pt-4">
        <LoveReadingSeoContent />
      </div>
    </UtilitiesToolShell>
  );
}
