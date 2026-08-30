import "server-only";

import { getCrawlProtectionSettings } from "@/lib/security/crawl-protection-settings";
import { checkInMemoryRateLimit } from "@/lib/security/rate-limit-store";
import { recordSecurityEvent } from "@/lib/security/security-events";
import type { SecurityRequestContext } from "@/lib/security/request-context";

export type RateLimitScope =
  | "chapter_read"
  | "search"
  | "comment"
  | "reaction"
  | "review"
  | "inline_comment"
  | "story_boost";

export type CheckRateLimitInput = {
  scope: RateLimitScope;
  subjectKey: string;
  limit: number;
  windowMs: number;
  ctx?: SecurityRequestContext;
  profileId?: string | null;
  path?: string;
};

export type CheckRateLimitResult = {
  allowed: boolean;
  remaining: number;
  challengeRequired: boolean;
};

export async function checkRateLimit(
  input: CheckRateLimitInput
): Promise<CheckRateLimitResult> {
  const settings = await getCrawlProtectionSettings();
  if (!settings.enabled) {
    return { allowed: true, remaining: input.limit, challengeRequired: false };
  }

  const result = checkInMemoryRateLimit({
    key: `${input.scope}:${input.subjectKey}`,
    limit: input.limit,
    windowMs: input.windowMs
  });

  if (!result.allowed && input.ctx) {
    await recordSecurityEvent({
      eventType: "rate_limit_hit",
      profileId: input.profileId,
      ipHash: input.ctx.ipHash,
      userAgent: input.ctx.userAgent,
      path: input.path ?? input.ctx.path,
      method: input.ctx.method,
      metadata: {
        scope: input.scope,
        subjectKey: input.subjectKey,
        limit: input.limit,
        windowMs: input.windowMs,
        count: result.count
      }
    });
  }

  const challengeRequired =
    !result.allowed &&
    settings.challengeEnabled &&
    Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());

  return {
    allowed: result.allowed,
    remaining: result.remaining,
    challengeRequired
  };
}

export async function checkChapterReadRateLimit(input: {
  profileId: string | null;
  subjectKey: string;
  ctx: SecurityRequestContext;
  path?: string;
}): Promise<CheckRateLimitResult> {
  const settings = await getCrawlProtectionSettings();
  if (!settings.enabled || !settings.readerRateLimitEnabled) {
    return { allowed: true, remaining: 999, challengeRequired: false };
  }

  const isLoggedIn = Boolean(input.profileId);
  const perMinute = isLoggedIn
    ? settings.loggedInChapterReadsPerMinute
    : settings.anonymousChapterReadsPerMinute;
  const perHour = isLoggedIn
    ? settings.loggedInChapterReadsPerHour
    : settings.anonymousChapterReadsPerHour;

  const minute = await checkRateLimit({
    scope: "chapter_read",
    subjectKey: `${input.subjectKey}:m`,
    limit: perMinute,
    windowMs: 60_000,
    ctx: input.ctx,
    profileId: input.profileId,
    path: input.path
  });

  if (!minute.allowed) {
    return minute;
  }

  return checkRateLimit({
    scope: "chapter_read",
    subjectKey: `${input.subjectKey}:h`,
    limit: perHour,
    windowMs: 60 * 60_000,
    ctx: input.ctx,
    profileId: input.profileId,
    path: input.path
  });
}

export async function checkScopedRateLimitFromSettings(input: {
  scope: Exclude<RateLimitScope, "chapter_read">;
  subjectKey: string;
  ctx?: SecurityRequestContext;
  profileId?: string | null;
  path?: string;
}): Promise<CheckRateLimitResult> {
  const settings = await getCrawlProtectionSettings();
  if (!settings.enabled) {
    return { allowed: true, remaining: 999, challengeRequired: false };
  }

  const map: Record<
    Exclude<RateLimitScope, "chapter_read">,
    { limit: number; windowMs: number }
  > = {
    search: { limit: settings.searchRequestsPerMinute, windowMs: 60_000 },
    comment: { limit: settings.commentRequestsPerMinute, windowMs: 60_000 },
    reaction: { limit: settings.reactionRequestsPerMinute, windowMs: 60_000 },
    review: { limit: settings.reviewRequestsPerHour, windowMs: 60 * 60_000 },
    inline_comment: { limit: settings.commentRequestsPerMinute, windowMs: 60_000 },
    story_boost: { limit: settings.commentRequestsPerMinute, windowMs: 60_000 }
  };

  const { limit, windowMs } = map[input.scope];
  return checkRateLimit({
    scope: input.scope,
    subjectKey: input.subjectKey,
    limit,
    windowMs,
    ctx: input.ctx,
    profileId: input.profileId,
    path: input.path
  });
}
