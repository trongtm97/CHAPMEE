import type { Metadata } from "next";
import { UtilitiesHubPage } from "@/components/utilities/UtilitiesHubPage";
import { UtilitiesHubSeoContent } from "@/components/utilities/UtilitiesHubSeoContent";
import { metadataForStaticRoute } from "@/lib/seo/public-page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForStaticRoute({
    path: "/tien-ich",
    pageType: "static",
    fallbackTitle: "Tiện ích — Icon Facebook & công cụ hỗ trợ | ChapMee",
    fallbackDescription:
      "Bộ tiện ích miễn phí trên ChapMee: Icon Facebook, emoji và các công cụ nhỏ trong mục Khám phá.",
    indexableOverride: true,
    followOverride: true
  });
}

export default function UtilitiesIndexPage() {
  return (
    <>
      <UtilitiesHubPage />
      <div className="shrink-0 border-t border-white/10 px-0.5 pt-6">
        <UtilitiesHubSeoContent />
      </div>
    </>
  );
}
