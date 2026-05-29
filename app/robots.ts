import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/truyen/",
          "/tac-gia/",
          "/the-loai/",
          "/tag/",
          "/bang-xep-hang",
          "/discover",
          "/community"
        ],
        disallow: [
          "/admin/",
          "/me/",
          "/creator/",
          "/studio/",
          "/login",
          "/register",
          "/onboarding",
          "/coin/",
          "/api/"
        ]
      }
    ],
    sitemap: "/sitemap.xml"
  };
}
