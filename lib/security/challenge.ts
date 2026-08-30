import "server-only";

import { recordSecurityEvent } from "@/lib/security/security-events";
import { getCrawlProtectionSettings } from "@/lib/security/crawl-protection-settings";

export function isTurnstileConfigured() {
  const site =
    process.env.TURNSTILE_SITE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  return Boolean(site && process.env.TURNSTILE_SECRET_KEY?.trim());
}

export function getTurnstileSiteKey() {
  return (
    process.env.TURNSTILE_SITE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ||
    null
  );
}

export async function verifyTurnstileToken(input: {
  token: string | null | undefined;
  ipHash?: string | null;
  profileId?: string | null;
  path?: string | null;
}): Promise<{ ok: boolean; error: string | null }> {
  const settings = await getCrawlProtectionSettings();
  if (!settings.challengeEnabled || !isTurnstileConfigured()) {
    return { ok: true, error: null };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    return { ok: true, error: null };
  }

  const token = input.token?.trim();
  if (!token) {
    await recordSecurityEvent({
      eventType: "challenge_failed",
      profileId: input.profileId,
      ipHash: input.ipHash,
      path: input.path,
      metadata: { reason: "missing_token" }
    });
    return { ok: false, error: "Thiếu mã xác minh." };
  }

  try {
    const body = new URLSearchParams({
      secret,
      response: token
    });

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body
    });

    const data = (await response.json()) as { success?: boolean };
    if (!data.success) {
      await recordSecurityEvent({
        eventType: "challenge_failed",
        profileId: input.profileId,
        ipHash: input.ipHash,
        path: input.path,
        metadata: { reason: "verify_failed" }
      });
      return { ok: false, error: "Xác minh không thành công." };
    }

    await recordSecurityEvent({
      eventType: "challenge_passed",
      profileId: input.profileId,
      ipHash: input.ipHash,
      path: input.path,
      metadata: {}
    });

    return { ok: true, error: null };
  } catch {
    return { ok: false, error: "Không thể xác minh. Thử lại sau." };
  }
}
