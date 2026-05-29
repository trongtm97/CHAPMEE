"use server";

import { applyAdminQualityAction } from "@/lib/admin/apply-quality-action";
import type { ContentQualityReasonCode } from "@/types/content-quality";

export async function adminConfirmLowQualityAction(input: {
  storyId: string;
  moderatorNote?: string;
  reasonCodes?: ContentQualityReasonCode[];
}) {
  return applyAdminQualityAction({
    ...input,
    action: "confirm_low_quality"
  });
}

export async function adminRestoreQualityAction(input: {
  storyId: string;
  moderatorNote?: string;
}) {
  return applyAdminQualityAction({ ...input, action: "restore" });
}

export async function adminPermanentHideAction(input: {
  storyId: string;
  moderatorNote: string;
}) {
  return applyAdminQualityAction({
    storyId: input.storyId,
    action: "permanent_hide",
    moderatorNote: input.moderatorNote
  });
}

export async function adminDisableMonetizationAction(input: {
  storyId: string;
  moderatorNote: string;
}) {
  return applyAdminQualityAction({
    storyId: input.storyId,
    action: "disable_monetization",
    moderatorNote: input.moderatorNote
  });
}

export async function adminHideTemporarilyAction(input: {
  storyId: string;
  moderatorNote?: string;
}) {
  return applyAdminQualityAction({
    storyId: input.storyId,
    action: "hide_temporarily",
    moderatorNote: input.moderatorNote
  });
}

export async function adminRejectAppealAction(input: {
  storyId: string;
  moderatorNote: string;
}) {
  return applyAdminQualityAction({
    storyId: input.storyId,
    action: "reject_appeal",
    moderatorNote: input.moderatorNote
  });
}

export async function adminApproveAppealAction(input: {
  storyId: string;
  moderatorNote?: string;
}) {
  return applyAdminQualityAction({
    storyId: input.storyId,
    action: "approve_appeal",
    moderatorNote: input.moderatorNote
  });
}
