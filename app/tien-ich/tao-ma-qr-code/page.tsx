import type { Metadata } from "next";

import { QrCodeGenerator } from "@/components/utilities/QrCodeGenerator";

import { QrCodeGeneratorSeoContent } from "@/components/utilities/QrCodeGeneratorSeoContent";

import { UtilitiesToolShell } from "@/components/utilities/UtilitiesToolShell";

import { metadataForStaticRoute } from "@/lib/seo/public-page-metadata";



export async function generateMetadata(): Promise<Metadata> {

  return metadataForStaticRoute({

    path: "/tien-ich/tao-ma-qr-code",

    pageType: "static",

    fallbackTitle: "Tạo Mã QR Code Online Miễn Phí | ChapMee",

    fallbackDescription:

      "Tạo mã QR Code miễn phí cho liên kết, văn bản, WiFi, danh thiếp, email, SMS — tải PNG/SVG, chạy trên trình duyệt, không lưu dữ liệu.",

    indexableOverride: true,

    followOverride: true

  });

}



export default function QrCodeGeneratorPage() {

  return (

    <UtilitiesToolShell>

      <QrCodeGenerator />

      <div className="shrink-0 border-t border-white/10 px-0.5 pb-2 pt-4">

        <QrCodeGeneratorSeoContent />

      </div>

    </UtilitiesToolShell>

  );

}

