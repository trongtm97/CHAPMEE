import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import {
  BRAND_APPLE_TOUCH_ICON_PATH,
  BRAND_FAVICON_PATH,
  BRAND_ICON_192_PATH,
  BRAND_ICON_512_PATH,
  brandAssetUrl
} from "@/lib/brand/constants";
import { buildDefaultMetadata, SITE_NAME } from "@/lib/seo/metadata";
import "./globals.css";

export const metadata: Metadata = {
  ...buildDefaultMetadata(),
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SITE_NAME
  },
  icons: {
    icon: [
      { url: brandAssetUrl(BRAND_FAVICON_PATH), type: "image/png", sizes: "32x32" },
      { url: brandAssetUrl(BRAND_ICON_192_PATH), type: "image/png", sizes: "192x192" },
      { url: brandAssetUrl(BRAND_ICON_512_PATH), type: "image/png", sizes: "512x512" }
    ],
    apple: [
      {
        url: brandAssetUrl(BRAND_APPLE_TOUCH_ICON_PATH),
        type: "image/png",
        sizes: "180x180"
      }
    ]
  }
};

export const viewport: Viewport = {
  themeColor: "#0b1016",
  colorScheme: "dark"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <AppShell>
          <PageViewTracker />
          {children}
        </AppShell>
      </body>
    </html>
  );
}
