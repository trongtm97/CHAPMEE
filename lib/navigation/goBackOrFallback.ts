"use client";

export function goBackOrFallback(fallbackHref: string) {
  if (typeof window === "undefined") {
    return;
  }

  const sameOriginReferrer =
    Boolean(document.referrer) &&
    new URL(document.referrer).origin === window.location.origin;

  if (sameOriginReferrer && window.history.length > 1) {
    window.history.back();
    return;
  }

  window.location.assign(fallbackHref);
}
