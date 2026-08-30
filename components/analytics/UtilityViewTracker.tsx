"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { analyticsEvents } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/trackEvent";
import { resolveUtilityItemByPathname } from "@/lib/utilities/utilities-hub";

/** Ghi nhận lượt mở tiện ích (1 lần / session / công cụ). */
export function UtilityViewTracker() {
  const pathname = usePathname();
  const trackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname?.startsWith("/tien-ich")) {
      return;
    }

    const utility = resolveUtilityItemByPathname(pathname);
    if (!utility) {
      return;
    }

    const sessionKey = `utility-used:${utility.id}`;
    if (trackedRef.current === utility.id) {
      return;
    }

    try {
      if (sessionStorage.getItem(sessionKey)) {
        trackedRef.current = utility.id;
        return;
      }
      sessionStorage.setItem(sessionKey, "1");
    } catch {
      // sessionStorage unavailable — still count once per mount.
    }

    trackedRef.current = utility.id;
    void trackEvent({
      eventName: analyticsEvents.utilityUsed,
      metadata: {
        utility_id: utility.id,
        utility_title: utility.title,
        pathname
      },
      targetId: utility.id,
      targetType: "page"
    });
  }, [pathname]);

  return null;
}
