import type { AdFormat, AdPlacementPublic, AdSizeMode } from "@/types/ads";

const SCRIPT_MARKER = "data-chapmee-adsense";

let scriptLoadPromise: Promise<void> | null = null;
let loadedClientId: string | null = null;

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

export function normalizeAdSenseClientId(clientId: string): string {
  const trimmed = clientId.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.startsWith("ca-pub-") ? trimmed : `ca-pub-${trimmed}`;
}

export function buildAdSenseScriptUrl(clientId: string): string {
  const normalized = normalizeAdSenseClientId(clientId);
  return `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(normalized)}`;
}

export function isBrowserEnvironment(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export function isAdSenseScriptOnPage(): boolean {
  if (!isBrowserEnvironment()) {
    return false;
  }
  return Boolean(document.querySelector(`script[${SCRIPT_MARKER}]`));
}

export function isAdSenseReady(): boolean {
  if (!isBrowserEnvironment()) {
    return false;
  }
  return Array.isArray(window.adsbygoogle);
}

/**
 * Load the AdSense script once per page (single client id).
 */
export function loadAdSenseScript(clientId: string): Promise<void> {
  if (!isBrowserEnvironment()) {
    return Promise.resolve();
  }

  const normalized = normalizeAdSenseClientId(clientId);
  if (!normalized) {
    return Promise.reject(new Error("invalid_client_id"));
  }

  if (isAdSenseScriptOnPage() && loadedClientId === normalized) {
    return Promise.resolve();
  }

  if (scriptLoadPromise && loadedClientId === normalized) {
    return scriptLoadPromise;
  }

  loadedClientId = normalized;
  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[${SCRIPT_MARKER}]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = buildAdSenseScriptUrl(normalized);
    script.setAttribute(SCRIPT_MARKER, "1");
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoadPromise = null;
      loadedClientId = null;
      reject(new Error("adsense_script_load_failed"));
    };
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

export function pushAdSenseAd(): { ok: boolean; reason?: string } {
  if (!isBrowserEnvironment()) {
    return { ok: false, reason: "no_browser" };
  }
  try {
    window.adsbygoogle = window.adsbygoogle ?? [];
    window.adsbygoogle.push({});
    return { ok: true };
  } catch {
    return { ok: false, reason: "adsense_push_error" };
  }
}

export function placementHasProductionAdSense(placement: AdPlacementPublic): boolean {
  return (
    placement.is_enabled &&
    !placement.is_test_mode &&
    Boolean(placement.adsense_client_id?.trim()) &&
    Boolean(placement.adsense_slot_id?.trim())
  );
}

export function getAdSlotMinHeight(placement: {
  size_mode: AdSizeMode;
  height: number | null;
  ad_format: AdFormat;
  width?: number | null;
}): number {
  if (placement.size_mode === "fixed" && placement.height) {
    return placement.height;
  }
  switch (placement.ad_format) {
    case "in_feed":
      return 120;
    case "in_article":
      return 100;
    case "multiplex":
      return 200;
    case "anchor":
      return 60;
    default:
      return 90;
  }
}

export type AdSenseInsAttributes = {
  className: string;
  style?: { display?: string; width?: number; height?: number };
  "data-ad-client": string;
  "data-ad-slot": string;
  "data-ad-format"?: string;
  "data-full-width-responsive"?: string;
  "data-ad-layout"?: string;
};

export function buildAdSenseInsAttributes(placement: AdPlacementPublic): AdSenseInsAttributes {
  const client = normalizeAdSenseClientId(placement.adsense_client_id ?? "");
  const slot = placement.adsense_slot_id?.trim() ?? "";

  const base: AdSenseInsAttributes = {
    className: "adsbygoogle block w-full",
    "data-ad-client": client,
    "data-ad-slot": slot
  };

  if (placement.size_mode === "responsive") {
    return {
      ...base,
      "data-ad-format": "auto",
      "data-full-width-responsive": "true"
    };
  }

  if (placement.size_mode === "fixed" && placement.width && placement.height) {
    return {
      ...base,
      style: { display: "inline-block", width: placement.width, height: placement.height }
    };
  }

  if (placement.size_mode === "fluid" || placement.ad_format === "in_feed") {
    return {
      ...base,
      "data-ad-format": "fluid",
      ...(placement.ad_format === "in_feed" ? { "data-ad-layout": "in-feed" } : {})
    };
  }

  if (placement.ad_format === "in_article") {
    return {
      ...base,
      "data-ad-format": "fluid",
      "data-ad-layout": "in-article"
    };
  }

  if (placement.ad_format === "multiplex") {
    return {
      ...base,
      "data-ad-format": "autorelaxed"
    };
  }

  if (placement.ad_format === "anchor") {
    return {
      ...base,
      "data-ad-format": "auto"
    };
  }

  return {
    ...base,
    "data-ad-format": "auto",
    "data-full-width-responsive": "true"
  };
}
