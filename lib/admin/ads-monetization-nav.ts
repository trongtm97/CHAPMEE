/** In-page tabs for the ads & creator ad-revenue admin area (sidebar has a single entry). */
export const ADMIN_ADS_MONETIZATION_NAV = [
  { href: "/admin/ads", label: "Placements" },
  { href: "/admin/ad-revenue", label: "Ước tính & báo cáo" },
  { href: "/admin/ad-revenue-policy", label: "Chính sách chia QC" },
  { href: "/admin/ad-revenue-reconciliation", label: "Đối soát tháng" },
  { href: "/admin/ad-fraud", label: "Fraud & hold" }
] as const;

export const ADMIN_ADS_MONETIZATION_HUB_HREF = "/admin/ads";

const MONETIZATION_HREFS = ADMIN_ADS_MONETIZATION_NAV.map((item) => item.href);

/** Longest-prefix match — avoids /admin/ad-revenue matching policy/reconciliation. */
export function isAdminAdsMonetizationNavActive(pathname: string, href: string): boolean {
  if (!(MONETIZATION_HREFS as readonly string[]).includes(href)) {
    return false;
  }
  const match = MONETIZATION_HREFS.find(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  return match === href;
}

export function isAdminAdsMonetizationSidebarActive(pathname: string): boolean {
  return MONETIZATION_HREFS.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}
