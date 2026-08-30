import type { Metadata, Viewport } from "next";
import { AppShellRoot } from "@/components/layout/AppShellRoot";
import { CodeSnippetRoot } from "@/components/snippets/CodeSnippetRoot";
import { InstalledAppsPermissionGate } from "@/components/security/InstalledAppsPermissionGate";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteFooterShell } from "@/components/layout/SiteFooterShell";
import { Suspense } from "react";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { GlobalFeedbackLauncher } from "@/components/feedback/GlobalFeedbackLauncher";
import {
  BRAND_APPLE_TOUCH_ICON_PATH,
  BRAND_FAVICON_PATH,
  BRAND_ICON_192_PATH,
  BRAND_ICON_512_PATH,
  brandAssetUrl
} from "@/lib/brand/constants";
import { isSearchEngineIndexingBlocked } from "@/lib/settings/get-site-launch-settings";
import { buildDefaultMetadata, buildRobotsMeta, SITE_NAME } from "@/lib/seo/metadata";
import {
  buildOrganizationJsonLd,
  buildWebSiteJsonLd
} from "@/lib/seo/structured-data";
import "./globals.css";

const rootLayoutIcons: Metadata["icons"] = {
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
};

export async function generateMetadata(): Promise<Metadata> {
  const base = buildDefaultMetadata();
  const blockSearchEngines = await isSearchEngineIndexingBlocked();

  return {
    ...base,
    ...(blockSearchEngines
      ? { robots: buildRobotsMeta({ indexable: false, followLinks: false }) }
      : {}),
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: SITE_NAME
    },
    icons: rootLayoutIcons
  };
}

export const viewport: Viewport = {
  themeColor: "#0b1016",
  colorScheme: "dark"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const organizationJsonLd = buildOrganizationJsonLd();
  const websiteJsonLd = buildWebSiteJsonLd();

  return (
    <html lang="vi">
      <body>
        <InstalledAppsPermissionGate />
        <CodeSnippetRoot />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <AppShellRoot
          feedback={
            <Suspense fallback={null}>
              <GlobalFeedbackLauncher />
            </Suspense>
          }
          footer={
            <SiteFooterShell>
              <Suspense fallback={null}>
                <SiteFooter />
              </Suspense>
            </SiteFooterShell>
          }
        >
          <PageViewTracker />
          {children}
        </AppShellRoot>
      </body>
    </html>
  );
}
