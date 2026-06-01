"use server";

import { generateRankingSnapshots } from "@/lib/ranking/generate-snapshots";
import { createAdminClient } from "@/lib/supabase/admin";

export async function regenerateRankingSnapshotsAction() {
  const supabase = createAdminClient();
  return generateRankingSnapshots(supabase);
}
