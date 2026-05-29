import { readEnv } from "@/lib/env/legacy-env";
import { headers } from "next/headers";
import type { PlatformKey } from "@/types/platform";

const RUNTIME_PLATFORM_HEADER_KEYS = [
  "x-chapmee-runtime-platform",
  "x-chapchap-runtime-platform",
  "x-runtime-platform"
] as const;

function isPlatformKey(value: string | null): value is PlatformKey {
  return (
    value === "web_desktop" ||
    value === "web_mobile_pwa" ||
    value === "android_app_future" ||
    value === "ios_app_future"
  );
}

function inferWebPlatformFromUserAgent(userAgent: string): PlatformKey {
  const isMobileAgent =
    /android|iphone|ipod|ipad|mobile|windows phone/i.test(userAgent);
  return isMobileAgent ? "web_mobile_pwa" : "web_desktop";
}

export async function detectRuntimePlatform(): Promise<PlatformKey> {
  const requestHeaders = await headers();

  for (const key of RUNTIME_PLATFORM_HEADER_KEYS) {
    const headerValue = requestHeaders.get(key);
    if (isPlatformKey(headerValue)) {
      return headerValue;
    }
  }

  const envPlatform =
    readEnv("CHAPMEE_RUNTIME_PLATFORM", "CHAPCHAP_RUNTIME_PLATFORM") ?? null;
  if (isPlatformKey(envPlatform)) {
    return envPlatform;
  }

  const userAgent = requestHeaders.get("user-agent") ?? "";
  return inferWebPlatformFromUserAgent(userAgent);
}
