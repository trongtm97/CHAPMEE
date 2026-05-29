import type { MetadataRoute } from "next";
import {
  BRAND_ICON_192_PATH,
  BRAND_ICON_512_PATH,
  BRAND_LOGO_PATH,
  BRAND_NAME,
  brandAssetUrl
} from "@/lib/brand/constants";
import { PWA_MANIFEST_DESCRIPTION } from "@/lib/seo/metadata";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND_NAME,
    short_name: BRAND_NAME,
    description: PWA_MANIFEST_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0b1016",
    theme_color: "#0b1016",
    icons: [
      {
        src: brandAssetUrl(BRAND_LOGO_PATH),
        sizes: "1107x292",
        type: "image/png",
        purpose: "any"
      },
      {
        src: brandAssetUrl(BRAND_ICON_192_PATH),
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: brandAssetUrl(BRAND_ICON_512_PATH),
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: brandAssetUrl(BRAND_ICON_512_PATH),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
