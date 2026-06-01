import type { AdDevice } from "@/types/ads";

export function resolveClientDevice(): "mobile" | "desktop" {
  if (typeof window === "undefined") {
    return "mobile";
  }
  return window.matchMedia("(min-width: 1024px)").matches ? "desktop" : "mobile";
}

export function deviceMatchesPlacement(
  placementDevice: AdDevice,
  clientDevice: AdDevice
): boolean {
  if (placementDevice === "all") {
    return true;
  }
  if (placementDevice === "tablet") {
    return clientDevice === "mobile";
  }
  return placementDevice === clientDevice;
}
