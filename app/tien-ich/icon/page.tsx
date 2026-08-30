import type { Metadata } from "next";
import { IconPicker } from "@/components/utilities/IconPicker";
import { IconUtilitySeoContent } from "@/components/utilities/IconUtilitySeoContent";
import { UtilitiesToolShell } from "@/components/utilities/UtilitiesToolShell";
import { FACEBOOK_ICON_CATALOG_COUNT } from "@/lib/utilities/facebook-icon-catalog";
import { metadataForStaticRoute } from "@/lib/seo/public-page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForStaticRoute({
    path: "/tien-ich/icon",
    pageType: "static",
    fallbackTitle: `Icon Facebook — ${FACEBOOK_ICON_CATALOG_COUNT}+ emoji miễn phí | ChapMee`,
    fallbackDescription:
      "Sao chép icon Facebook, emoji, biểu tượng cảm xúc và cờ quốc gia nhanh — công cụ miễn phí trên ChapMee. Chạm để copy, dán vào status hoặc bình luận.",
    indexableOverride: true,
    followOverride: true
  });
}

export default function IconUtilityPage() {
  return (
    <UtilitiesToolShell>
      <IconPicker />
      <div className="shrink-0 border-t border-white/10 px-0.5 pb-2 pt-4">
        <IconUtilitySeoContent />
      </div>
    </UtilitiesToolShell>
  );
}
