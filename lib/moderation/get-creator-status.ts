"use server";

import { createClient } from "@/lib/data/server";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import { getAccountStatus } from "@/lib/moderation/get-account-status";
import type { CreatorStatusSummary } from "@/types/moderation";

export async function getCreatorStatus(
  userId: string,
  creatorProfileId: string | null
): Promise<CreatorStatusSummary> {
  const account = await getAccountStatus(userId);
  const db = await createClient();

  const monetization = account.activeRestrictions.find(
    (r) => r.restrictionType === "creator_monetization_hold"
  );
  const payout = account.activeRestrictions.find(
    (r) => r.restrictionType === "payout_hold"
  );
  const publishBlock = account.activeRestrictions.some(
    (r) => r.restrictionType === "story_publish_block"
  );

  let pendingReviewStories = 0;
  if (creatorProfileId) {
    const { count } = await db
      .from("stories")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", creatorProfileId)
      .eq("status", "pending");
    pendingReviewStories = count ?? 0;
  }

  return {
    canPublishStories: !publishBlock,
    monetizationHeld: Boolean(monetization),
    payoutHeld: Boolean(payout),
    monetizationHoldEndsAt: monetization?.endsAt ?? null,
    payoutHoldEndsAt: payout?.endsAt ?? null,
    recentViolations: account.recentViolations,
    pendingReviewStories
  };
}

export async function getCreatorStatusSafe(
  userId: string,
  creatorProfileId: string | null
): Promise<CreatorStatusSummary> {
  try {
    return await getCreatorStatus(userId, creatorProfileId);
  } catch {
    return {
      canPublishStories: true,
      monetizationHeld: false,
      payoutHeld: false,
      monetizationHoldEndsAt: null,
      payoutHoldEndsAt: null,
      recentViolations: [],
      pendingReviewStories: 0
    };
  }
}
