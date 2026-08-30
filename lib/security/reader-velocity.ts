import "server-only";

import { getCrawlProtectionSettings } from "@/lib/security/crawl-protection-settings";
import { checkInMemoryRateLimit } from "@/lib/security/rate-limit-store";
import { recordSecurityEvent } from "@/lib/security/security-events";
import type { SecurityRequestContext } from "@/lib/security/request-context";

export type ReaderVelocityResult = {
  suspicious: boolean;
  challengeRequired: boolean;
  reason: string | null;
};

export async function checkReaderVelocity(input: {
  chapterId: string;
  profileId: string | null;
  ctx: SecurityRequestContext;
  path?: string;
}): Promise<ReaderVelocityResult> {
  const settings = await getCrawlProtectionSettings();
  if (!settings.enabled) {
    return { suspicious: false, challengeRequired: false, reason: null };
  }

  const subject = input.ctx.ipHash ?? input.profileId ?? "unknown";
  const threshold =
    Number(settings.challengeThresholdJson.chapter_reads_per_minute) || 15;

  const burst = checkInMemoryRateLimit({
    key: `velocity:chapters:${subject}`,
    limit: threshold,
    windowMs: 60_000
  });

  const sequential = checkInMemoryRateLimit({
    key: `velocity:seq:${subject}:${input.chapterId}`,
    limit: 3,
    windowMs: 30_000
  });

  const missingUa = !input.ctx.userAgent?.trim();
  const suspicious = !burst.allowed || !sequential.allowed || missingUa;

  if (suspicious) {
    await recordSecurityEvent({
      eventType: "suspicious_reader_velocity",
      profileId: input.profileId,
      ipHash: input.ctx.ipHash,
      userAgent: input.ctx.userAgent,
      path: input.path ?? input.ctx.path,
      method: input.ctx.method,
      metadata: {
        chapterId: input.chapterId,
        burstCount: burst.count,
        sequentialCount: sequential.count,
        missingUa
      }
    });
  }

  const challengeRequired =
    suspicious &&
    settings.challengeEnabled &&
    Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());

  return {
    suspicious,
    challengeRequired,
    reason: suspicious
      ? "Phát hiện lượt đọc chương bất thường. Vui lòng xác minh nếu được yêu cầu."
      : null
  };
}
