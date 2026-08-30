import "server-only";

import { createHash } from "crypto";
import { headers } from "next/headers";

export type SecurityRequestContext = {
  ipHash: string | null;
  userAgent: string | null;
  path: string | null;
  method: string | null;
};

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

export async function getSecurityRequestContext(
  pathOverride?: string
): Promise<SecurityRequestContext> {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for");
  const realIp = headerStore.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() || realIp?.trim() || null;
  const userAgent = headerStore.get("user-agent");

  return {
    ipHash: ip ? hashValue(ip) : null,
    userAgent: userAgent?.slice(0, 512) ?? null,
    path: pathOverride ?? headerStore.get("x-pathname") ?? headerStore.get("referer"),
    method: headerStore.get("x-http-method") ?? "GET"
  };
}

export function isGoodBotUserAgent(
  userAgent: string | null,
  allowlist: string[]
): boolean {
  if (!userAgent) {
    return false;
  }
  const lower = userAgent.toLowerCase();
  return allowlist.some((bot) => lower.includes(bot.toLowerCase()));
}
