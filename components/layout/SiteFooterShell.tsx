"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function isCompactFooterRoute(pathname: string) {
  return (
    pathname.startsWith("/discover") ||
    pathname.startsWith("/media") ||
    pathname.startsWith("/community") ||
    pathname.startsWith("/reels") ||
    pathname === "/me" ||
    pathname.startsWith("/me/") ||
    pathname === "/truyen" ||
    pathname.startsWith("/truyen/") ||
    pathname.startsWith("/truyen-sang-tac") ||
    pathname.startsWith("/truyen-dich")
  );
}

type SiteFooterShellProps = {
  children: ReactNode;
};

/** Thu gọn footer trên feed/catalog và /me — đặc biệt mobile. */
export function SiteFooterShell({ children }: SiteFooterShellProps) {
  const pathname = usePathname();
  const compact = isCompactFooterRoute(pathname);

  if (!compact) {
    return <>{children}</>;
  }

  return (
    <div className="site-footer-compact [&_footer]:py-3 [&_footer>div]:py-3 sm:[&_footer]:py-4 [&_footer_.footer-bottom-bar]:mt-3 [&_footer_.footer-bottom-bar]:pt-3 [&_footer_.footer-compact-grid]:gap-4 [&_footer_.text-xs.leading-relaxed]:line-clamp-2 max-md:[&_footer_.footer-compact-grid]:grid-cols-1">
      {children}
    </div>
  );
}
