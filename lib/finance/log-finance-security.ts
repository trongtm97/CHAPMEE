"use server";

import { headers } from "next/headers";
import { insertFinanceSecurityLog } from "@/lib/data/creator-finance";
import type { FinanceSecurityEventType } from "@/types/finance";

async function requestMeta() {
  const headerStore = await headers();
  return {
    ipAddress: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: headerStore.get("user-agent")
  };
}

export async function logFinanceSecurityEvent(input: {
  creatorUserId: string;
  eventType: FinanceSecurityEventType;
  metadata?: Record<string, unknown>;
}) {
  const meta = await requestMeta();
  return insertFinanceSecurityLog({
    creatorUserId: input.creatorUserId,
    eventType: input.eventType,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    metadata: input.metadata
  });
}
