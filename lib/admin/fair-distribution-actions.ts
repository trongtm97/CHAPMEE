"use server";

import { createClient } from "@/lib/supabase/server";
import { requireFinanceSettingsView } from "@/lib/auth/require-permission";
import {
  explainRecommendation,
  runSimulation,
  rollupFairDistributionDaily
} from "@/lib/fair-distribution";
import type { FairDistributionSurface } from "@/types/fair-distribution";
import type { FeedSurface } from "@/types/feed-mixer";

export async function runFairDistributionSimulationAction(input: {
  surface: FeedSurface;
  limit?: number;
}) {
  const guard = await requireFinanceSettingsView("/admin/algorithm");
  if (!guard.ok) {
    return { success: false as const, error: guard.error };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const result = await runSimulation(
    supabase,
    input.surface,
    user?.id ?? null,
    input.limit ?? 30
  );

  return { success: true as const, result };
}

export async function explainRecommendationAction(input: {
  storyId: string;
  surface?: FairDistributionSurface;
}) {
  const guard = await requireFinanceSettingsView("/admin/algorithm");
  if (!guard.ok) {
    return { success: false as const, error: guard.error };
  }

  const supabase = await createClient();
  const result = await explainRecommendation(
    supabase,
    input.storyId.trim(),
    input.surface ?? "reels"
  );

  return { success: true as const, result };
}

export async function rebuildFairDistributionRollupsAction() {
  const guard = await requireFinanceSettingsView("/admin/algorithm");
  if (!guard.ok) {
    return { success: false as const, error: guard.error };
  }

  const result = await rollupFairDistributionDaily();
  if (!result.ok) {
    return { success: false as const, error: result.error ?? "Rollup failed" };
  }

  return { success: true as const, result };
}
