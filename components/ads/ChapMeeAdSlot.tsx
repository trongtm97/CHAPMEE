"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAdSlotBudget } from "@/components/ads/AdSlotBudgetContext";
import { useAdSenseContext } from "@/components/ads/AdSenseContext";
import { deviceMatchesPlacement, resolveClientDevice } from "@/lib/ads/match-device";
import { logAdEvent } from "@/lib/ads/logAdEvent";
import { isAdAllowedRoute } from "@/lib/ads/routeRules";
import {
  buildAdSenseInsAttributes,
  getAdSlotMinHeight,
  placementHasProductionAdSense,
  pushAdSenseAd
} from "@/lib/ads/adsense";
import type { AdPlacementPublic } from "@/types/ads";

export type ChapMeeAdSlotProps = {
  placementKey: string;
  storyId?: string;
  chapterId?: string;
  authorId?: string;
  className?: string;
  /** Admin preview panel — show test placeholder even in production build */
  forcePreview?: boolean;
};

function shouldShowTestPlaceholder(placement: AdPlacementPublic, forcePreview?: boolean): boolean {
  if (forcePreview) {
    return placement.is_test_mode;
  }
  return placement.is_test_mode && process.env.NODE_ENV === "development";
}

async function fetchPlacement(
  placementKey: string,
  route: string,
  signal?: AbortSignal
): Promise<AdPlacementPublic | null> {
  const params = new URLSearchParams({ route });
  const res = await fetch(`/api/ads/placements/${encodeURIComponent(placementKey)}?${params}`, {
    signal
  });
  if (!res.ok) {
    return null;
  }
  const json = (await res.json()) as { placement?: AdPlacementPublic | null };
  return json.placement ?? null;
}

function AdSlotSkeleton({
  minHeight,
  className
}: {
  minHeight: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-xl bg-white/[0.04] ${className ?? ""}`}
      style={{ minHeight }}
    />
  );
}

export function ChapMeeAdSlot({
  placementKey,
  storyId,
  chapterId,
  authorId,
  className = "",
  forcePreview = false
}: ChapMeeAdSlotProps) {
  const pathname = usePathname() ?? "/";
  const budget = useAdSlotBudget();
  const { registerProductionSlot, scriptReady } = useAdSenseContext();
  const [placement, setPlacement] = useState<AdPlacementPublic | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [adPushed, setAdPushed] = useState(false);
  const [clientDevice, setClientDevice] = useState<"mobile" | "desktop">(() =>
    typeof window !== "undefined" ? resolveClientDevice() : "mobile"
  );
  const insRef = useRef<HTMLModElement>(null);
  const loggedRef = useRef({ impression: false, rendered: false, blocked: false });

  useEffect(() => {
    const update = () => setClientDevice(resolveClientDevice());
    update();
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => update();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const routeAllowed = isAdAllowedRoute(pathname);

  useEffect(() => {
    if (!routeAllowed) {
      setLoaded(true);
      setPlacement(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setLoaded(false);
    void (async () => {
      try {
        const data = await fetchPlacement(placementKey, pathname, controller.signal);
        if (!cancelled) {
          setPlacement(data);
          setLoaded(true);
        }
      } catch (error) {
        if (!cancelled && !(error instanceof DOMException && error.name === "AbortError")) {
          setPlacement(null);
          setLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [placementKey, pathname, routeAllowed]);

  const blockedReason = useMemo(() => {
    if (!routeAllowed) {
      return "route_blocked";
    }
    if (!loaded) {
      return "loading";
    }
    if (!placement?.is_enabled) {
      return "disabled";
    }
    if (!deviceMatchesPlacement(placement.device, clientDevice)) {
      return "device_mismatch";
    }
    return null;
  }, [loaded, placement, clientDevice, routeAllowed]);

  const overPageBudget =
    placement &&
    budget &&
    !budget.tryConsumeSlot(placementKey, placement.max_per_page ?? 1);

  const finalBlocked = blockedReason ?? (overPageBudget ? "max_per_page" : null);

  const showTest =
    placement && !finalBlocked && shouldShowTestPlaceholder(placement, forcePreview);

  const canRenderAdSense =
    placement &&
    !finalBlocked &&
    !showTest &&
    placementHasProductionAdSense(placement);

  const minHeight = placement ? getAdSlotMinHeight(placement) : 90;

  useEffect(() => {
    loggedRef.current = { impression: false, rendered: false, blocked: false };
    setAdPushed(false);
  }, [placementKey, pathname]);

  useEffect(() => {
    if (!placement?.id || finalBlocked === "loading") {
      return;
    }

    if (finalBlocked) {
      if (!loggedRef.current.blocked) {
        loggedRef.current.blocked = true;
        void logAdEvent({
          placementId: placement.id,
          eventType: "blocked",
          reason: finalBlocked,
          route: pathname,
          device: clientDevice,
          storyId,
          chapterId,
          authorId
        });
      }
      return;
    }

    if (!loggedRef.current.impression) {
      loggedRef.current.impression = true;
      void logAdEvent({
        placementId: placement.id,
        eventType: "impression_attempt",
        route: pathname,
        device: clientDevice,
        storyId,
        chapterId,
        authorId
      });
    }
  }, [placement?.id, finalBlocked, pathname, clientDevice, storyId, chapterId, authorId]);

  useEffect(() => {
    if (!canRenderAdSense || !placement?.adsense_client_id) {
      return;
    }
    return registerProductionSlot(placement.adsense_client_id);
  }, [canRenderAdSense, placement?.adsense_client_id, registerProductionSlot]);

  useEffect(() => {
    if (!canRenderAdSense || !placement?.id || !scriptReady || adPushed) {
      return;
    }
    if (!insRef.current) {
      return;
    }

    const result = pushAdSenseAd();
    if (!result.ok) {
      if (!loggedRef.current.blocked) {
        loggedRef.current.blocked = true;
        void logAdEvent({
          placementId: placement.id,
          eventType: "blocked",
          reason: result.reason ?? "adsense_push_error",
          route: pathname,
          device: clientDevice,
          storyId,
          chapterId,
          authorId
        });
      }
      return;
    }

    setAdPushed(true);
    if (!loggedRef.current.rendered) {
      loggedRef.current.rendered = true;
      void logAdEvent({
        placementId: placement.id,
        eventType: "rendered",
        route: pathname,
        device: clientDevice,
        storyId,
        chapterId,
        authorId
      });
    }
  }, [
    canRenderAdSense,
    placement?.id,
    scriptReady,
    adPushed,
    pathname,
    clientDevice,
    storyId,
    chapterId,
    authorId
  ]);

  useEffect(() => {
    if (!showTest || !placement?.id || loggedRef.current.rendered) {
      return;
    }
    loggedRef.current.rendered = true;
    void logAdEvent({
      placementId: placement.id,
      eventType: "rendered",
      reason: "test_mode",
      route: pathname,
      device: clientDevice,
      storyId,
      chapterId,
      authorId
    });
  }, [showTest, placement?.id, pathname, clientDevice, storyId, chapterId, authorId]);

  if (!loaded || finalBlocked || !placement) {
    return null;
  }

  if (showTest) {
    return (
      <div
        className={`my-4 w-full ${className}`}
        data-ad-placement={placementKey}
        role="complementary"
        aria-label="Vị trí quảng cáo thử nghiệm"
        style={{ minHeight: placement.reserve_space !== false ? minHeight : undefined }}
      >
        {placement.show_label !== false ? (
          <p className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500">Quảng cáo</p>
        ) : null}
        <div className="flex min-h-[90px] items-center justify-center rounded-xl border border-dashed border-amber-400/40 bg-amber-400/5 px-4 py-6 text-center text-sm text-amber-200/90">
          {placement.fallback_text?.trim() || `Ad test slot · ${placementKey}`}
        </div>
      </div>
    );
  }

  if (!canRenderAdSense) {
    return null;
  }

  const insProps = buildAdSenseInsAttributes(placement);
  const { className: insClassName, style: insStyle, ...dataAttrs } = insProps;

  return (
    <div
      className={`my-4 w-full max-w-full overflow-hidden ${className}`}
      data-ad-format={placement.ad_format}
      data-ad-placement={placementKey}
      role="complementary"
      aria-label="Quảng cáo"
      style={{
        minHeight: placement.reserve_space !== false ? minHeight : undefined,
        maxWidth: placement.max_width ?? undefined
      }}
    >
      {placement.show_label !== false ? (
        <p className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500">Quảng cáo</p>
      ) : null}
      {!adPushed && placement.lazy_load !== false ? (
        <AdSlotSkeleton className="mb-0 w-full" minHeight={minHeight} />
      ) : null}
      <ins
        ref={insRef}
        className={insClassName}
        style={{
          ...insStyle,
          minHeight: placement.reserve_space !== false && !adPushed ? minHeight : undefined
        }}
        {...dataAttrs}
      />
    </div>
  );
}
