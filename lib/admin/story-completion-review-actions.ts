"use server";

import {
  rejectStoryCompletionReview,
  unlockStoryFullAccessEscrowRevenue
} from "@/lib/monetization/story-completion-escrow";
import { requireAnyPermission } from "@/lib/auth/require-permission";

export async function adminApproveStoryCompletionAction(input: {
  storyId: string;
  adminNote?: string;
}) {
  const guard = await requireAnyPermission(
    ["finance.dashboard.view"],
    { returnTo: "/admin/monetization/completion-reviews" }
  );

  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  return unlockStoryFullAccessEscrowRevenue({
    storyId: input.storyId,
    adminUserId: guard.context.userId,
    adminNote: input.adminNote
  });
}

export async function adminRejectStoryCompletionAction(input: {
  storyId: string;
  adminNote: string;
}) {
  const guard = await requireAnyPermission(
    ["finance.dashboard.view"],
    { returnTo: "/admin/monetization/completion-reviews" }
  );

  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  return rejectStoryCompletionReview({
    storyId: input.storyId,
    adminUserId: guard.context.userId,
    adminNote: input.adminNote
  });
}
