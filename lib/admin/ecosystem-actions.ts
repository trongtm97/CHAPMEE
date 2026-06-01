"use server";

import { createColdStartTestForStory } from "@/lib/cold-start/create";
import { logFairnessAdjustments } from "@/lib/fairness/adjustment-log";
import { createAdminClient } from "@/lib/supabase/admin";

export async function ecosystemBoostStoryAction(storyId: string) {
  const supabase = createAdminClient();
  const result = await createColdStartTestForStory(supabase, storyId);

  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }

  await logFairnessAdjustments(supabase, [
    {
      itemType: "story",
      itemId: storyId,
      storyId,
      surface: "discover",
      adjustmentType: "under_exposed_boost",
      oldScore: 0.35,
      newScore: 0.55,
      reason: "Admin tạo cold start boost thử nghiệm",
      metadata: { source: "ecosystem_dashboard", test_id: result.test?.id }
    }
  ]);

  return { ok: true as const };
}

export async function ecosystemReduceExposureAction(input: {
  itemType: "story" | "author";
  itemId: string;
  storyId?: string | null;
  authorUserId?: string | null;
  surface: string;
  sharePercent: number;
}) {
  const supabase = createAdminClient();

  await logFairnessAdjustments(supabase, [
    {
      itemType: input.itemType,
      itemId: input.itemId,
      storyId: input.storyId ?? null,
      authorUserId: input.authorUserId ?? null,
      surface: input.surface,
      adjustmentType:
        input.itemType === "author" ? "author_cap_penalty" : "story_cap_penalty",
      oldScore: 0.6,
      newScore: 0.25,
      reason: `Admin giảm hiển thị thủ công — share ${input.sharePercent.toFixed(1)}%`,
      metadata: { source: "ecosystem_dashboard", manual: true }
    }
  ]);

  return { ok: true as const };
}
