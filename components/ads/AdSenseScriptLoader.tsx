"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAdSenseContext } from "@/components/ads/AdSenseContext";
import { isAdAllowedRoute } from "@/lib/ads/routeRules";
import { isBrowserEnvironment, loadAdSenseScript } from "@/lib/ads/adsense";

/**
 * Loads the Google AdSense script once when at least one production slot is active
 * on an ad-allowed route.
 */
export function AdSenseScriptLoader() {
  const pathname = usePathname() ?? "/";
  const { activeClientId, activeSlotCount, setScriptReady } = useAdSenseContext();
  const loadingRef = useRef(false);

  const routeAllowed = isAdAllowedRoute(pathname);
  const shouldLoad =
    isBrowserEnvironment() &&
    routeAllowed &&
    activeSlotCount > 0 &&
    Boolean(activeClientId?.trim());

  useEffect(() => {
    if (!shouldLoad || !activeClientId) {
      setScriptReady(false);
      return;
    }

    if (loadingRef.current) {
      return;
    }

    loadingRef.current = true;
    let cancelled = false;

    void loadAdSenseScript(activeClientId)
      .then(() => {
        if (!cancelled) {
          setScriptReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setScriptReady(false);
        }
      })
      .finally(() => {
        loadingRef.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [shouldLoad, activeClientId, setScriptReady]);

  return null;
}
