import type { MetadataRoute } from "next";

/** Child sitemap ids → `/sitemap/{id}.xml` (Next.js generateSitemaps). */
export const SITEMAP_SEGMENT_IDS = [
  "static",
  "stories",
  "chapters",
  "taxonomy",
  "authors",
  "media",
  "posts",
  "policies",
  "reels"
] as const;

export type SitemapSegmentId = (typeof SITEMAP_SEGMENT_IDS)[number];

export function isSitemapSegmentId(value: string): value is SitemapSegmentId {
  return (SITEMAP_SEGMENT_IDS as readonly string[]).includes(value);
}

export function classifySitemapPathname(pathname: string): string {
  if (
    pathname === "/" ||
    [
      "/discover",
      "/media",
      "/reels",
      "/truyen",
      "/truyen-sang-tac",
      "/truyen-dich",
      "/bai-viet",
      "/chinh-sach",
      "/thong-bao",
      "/community",
      "/bang-xep-hang",
      "/kham-pha",
      "/tien-ich",
      "/tien-ich/icon",
      "/tien-ich/xoa-dau-tieng-viet",
      "/tien-ich/chuyen-so-tien-thanh-chu",
      "/tien-ich/dem-tu-ky-tu",
      "/tien-ich/chuyen-chu-hoa-thuong",
      "/tien-ich/tao-ma-qr-code",
      "/tien-ich/tinh-bmi",
      "/tien-ich/tinh-tdee",
      "/tien-ich/tinh-lai-suat",
      "/tien-ich/tinh-thue-vat",
      "/tien-ich/tinh-phan-tram",
      "/tien-ich/tinh-ngay-quan-he-an-toan",
      "/tien-ich/pomodoro",
      "/the-loai"
    ].includes(pathname)
  ) {
    return "static";
  }
  if (pathname.includes("/chuong/")) return "chapters";
  if (pathname.startsWith("/truyen/")) return "stories";
  if (pathname.startsWith("/bai-viet/") || pathname.startsWith("/thong-bao/")) return "posts";
  if (pathname.startsWith("/chinh-sach/")) return "policies";
  if (pathname.startsWith("/reels/")) return "reels";
  if (
    pathname.startsWith("/the-loai") ||
    pathname.startsWith("/tag/") ||
    pathname.startsWith("/boi-canh/") ||
    pathname.startsWith("/cam-giac/") ||
    pathname.startsWith("/dinh-dang/") ||
    pathname.startsWith("/nhan-vat/") ||
    pathname.startsWith("/quan-he/") ||
    pathname.startsWith("/phong-cach/") ||
    pathname.startsWith("/canh-bao/") ||
    pathname.startsWith("/tinh-trang/") ||
    pathname.startsWith("/goi-truy-cap/") ||
    pathname.startsWith("/loai-truyen/") ||
    pathname.startsWith("/do-tuoi/")
  ) {
    return "taxonomy";
  }
  if (pathname.startsWith("/@")) {
    return "authors";
  }
  if (pathname === "/media" || pathname.startsWith("/truyen-sang-tac") || pathname.startsWith("/truyen-dich")) {
    return "media";
  }
  return "other";
}

export function countSitemapBreakdown(entries: MetadataRoute.Sitemap): Record<string, number> {
  const breakdown: Record<string, number> = {};
  for (const entry of entries) {
    try {
      const path = new URL(entry.url).pathname;
      const group = classifySitemapPathname(path);
      breakdown[group] = (breakdown[group] ?? 0) + 1;
    } catch {
      breakdown.other = (breakdown.other ?? 0) + 1;
    }
  }
  return breakdown;
}

export function childSitemapPaths(): Array<{ id: SitemapSegmentId; path: string }> {
  return SITEMAP_SEGMENT_IDS.map((id) => ({ id, path: `/sitemap/${id}.xml` }));
}
