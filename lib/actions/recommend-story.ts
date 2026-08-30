"use server";

import { revalidatePath } from "next/cache";
import { spendTicketsForStoryRecommendation } from "@/lib/recommendations/spend";

export async function recommendStoryAction(
  storyId: string,
  tickets: number,
  returnTo?: string
) {
  const result = await spendTicketsForStoryRecommendation(storyId, tickets);
  if (result.ok) {
    revalidatePath("/bang-xep-hang/duoc-de-cu");
    revalidatePath("/bang-xep-hang");
    if (returnTo) {
      revalidatePath(returnTo);
    }
  }
  return result;
}
