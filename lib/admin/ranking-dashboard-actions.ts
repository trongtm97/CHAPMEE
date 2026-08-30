"use server";

import { generateRankingSnapshots } from "@/lib/ranking/generate-snapshots";
import { createAdminClient } from "@/lib/data/admin";

export async function regenerateRankingSnapshotsAction() {
  const db = createAdminClient();
  return generateRankingSnapshots(db);
}
