import "server-only";

import { getCrawlProtectionSettings } from "@/lib/security/crawl-protection-settings";
import { checkChapterReadRateLimit } from "@/lib/security/rate-limit";
import { checkReaderVelocity } from "@/lib/security/reader-velocity";
import { isGoodBotUserAgent, type SecurityRequestContext } from "@/lib/security/request-context";
import { recordSecurityEvent } from "@/lib/security/security-events";
import { verifyTurnstileToken } from "@/lib/security/challenge";

export type GuardChapterReadInput = {
  chapterId: string;
  profileId: string | null;
  ctx: SecurityRequestContext;
  path?: string;
  turnstileToken?: string | null;
  allowFullBody: boolean;
};

export type GuardChapterReadResult = {
  allowed: boolean;
  allowFullBody: boolean;
  challengeRequired: boolean;
  error: string | null;
};

export async function guardChapterRead(
  input: GuardChapterReadInput
): Promise<GuardChapterReadResult> {
  const settings = await getCrawlProtectionSettings();

  if (!input.allowFullBody) {
    return {
      allowed: true,
      allowFullBody: false,
      challengeRequired: false,
      error: null
    };
  }

  if (!settings.enabled) {
    return {
      allowed: true,
      allowFullBody: true,
      challengeRequired: false,
      error: null
    };
  }

  if (isGoodBotUserAgent(input.ctx.userAgent, settings.goodBotAllowlist)) {
    return {
      allowed: true,
      allowFullBody: true,
      challengeRequired: false,
      error: null
    };
  }

  const subjectKey = input.profileId ?? input.ctx.ipHash ?? "anon";

  const rate = await checkChapterReadRateLimit({
    profileId: input.profileId,
    subjectKey,
    ctx: input.ctx,
    path: input.path
  });

  if (!rate.allowed) {
    if (rate.challengeRequired) {
      const verified = await verifyTurnstileToken({
        token: input.turnstileToken,
        ipHash: input.ctx.ipHash,
        profileId: input.profileId,
        path: input.path
      });
      if (!verified.ok) {
        await recordSecurityEvent({
          eventType: "challenge_required",
          profileId: input.profileId,
          ipHash: input.ctx.ipHash,
          userAgent: input.ctx.userAgent,
          path: input.path,
          metadata: { reason: "rate_limit" }
        });
        return {
          allowed: false,
          allowFullBody: false,
          challengeRequired: true,
          error: verified.error ?? "Vui lòng xác minh để tiếp tục đọc."
        };
      }
    } else {
      return {
        allowed: false,
        allowFullBody: false,
        challengeRequired: false,
        error: "Bạn đang đọc quá nhanh. Thử lại sau vài phút."
      };
    }
  }

  const velocity = await checkReaderVelocity({
    chapterId: input.chapterId,
    profileId: input.profileId,
    ctx: input.ctx,
    path: input.path
  });

  if (velocity.challengeRequired) {
    const verified = await verifyTurnstileToken({
      token: input.turnstileToken,
      ipHash: input.ctx.ipHash,
      profileId: input.profileId,
      path: input.path
    });
    if (!verified.ok) {
      await recordSecurityEvent({
        eventType: "challenge_required",
        profileId: input.profileId,
        ipHash: input.ctx.ipHash,
        userAgent: input.ctx.userAgent,
        path: input.path,
        metadata: { reason: "velocity" }
      });
      return {
        allowed: false,
        allowFullBody: false,
        challengeRequired: true,
        error: velocity.reason
      };
    }
  } else if (velocity.suspicious && !rate.allowed) {
    return {
      allowed: false,
      allowFullBody: false,
      challengeRequired: false,
      error: velocity.reason
    };
  }

  return {
    allowed: true,
    allowFullBody: true,
    challengeRequired: false,
    error: null
  };
}
