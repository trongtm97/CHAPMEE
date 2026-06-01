"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ADMIN_ADS_MONETIZATION_NAV,
  isAdminAdsMonetizationNavActive
} from "@/lib/admin/ads-monetization-nav";

export function AdminAdsMonetizationSectionNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Điều hướng quảng cáo & chia sẻ QC"
      className="flex flex-wrap gap-2 border-b border-white/10 pb-2"
    >
      {ADMIN_ADS_MONETIZATION_NAV.map((item) => {
        const active = isAdminAdsMonetizationNavActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
              active
                ? "bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/35"
                : "text-zinc-500 hover:text-zinc-200"
            }`}
            href={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** @deprecated Use AdminAdsMonetizationSectionNav */
export const AdminAdRevenueSectionNav = AdminAdsMonetizationSectionNav;
