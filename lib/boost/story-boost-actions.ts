"use server";

import { revalidatePath } from "next/cache";
import { spendStoryBoost } from "@/lib/boost/spend-story-boost";
import { getStoryBoostEligibility } from "@/lib/boost/get-boost-eligibility";

export async function spendStoryBoostAction(
  storyId: string,
  returnTo?: string,
  units = 1,
  message?: string | null
) {
  const result = await spendStoryBoost(storyId, units, message);
  if (result.ok && returnTo) {
    revalidatePath(returnTo);
    revalidatePath("/bang-xep-hang");
  }
  return result;
}

export async function loadStoryBoostEligibilityAction(storyId: string) {
  const { user } = await import("@/lib/auth/getCurrentUser").then((m) => m.getCurrentUser());
  return getStoryBoostEligibility({ storyId, userId: user?.id ?? null });
}
