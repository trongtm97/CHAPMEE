"use server";

import { evaluateColdStartTest } from "@/lib/cold-start/evaluate";
import { createAdminClient } from "@/lib/data/admin";
import type { ColdStartStatus } from "@/types/cold-start";

export async function coldStartAdminAction(
  testId: string,
  action: "pause" | "resume" | "force_qualify" | "stop"
) {
  const db = createAdminClient();
  const now = new Date().toISOString();

  if (action === "pause") {
    await db
      .from("cold_start_tests")
      .update({ status: "paused", updated_at: now })
      .eq("id", testId);
    return { ok: true };
  }

  if (action === "resume") {
    await db
      .from("cold_start_tests")
      .update({ status: "active", updated_at: now })
      .eq("id", testId);
    return { ok: true };
  }

  if (action === "force_qualify") {
    return evaluateColdStartTest(db, testId, { forceQualify: true });
  }

  if (action === "stop") {
    return evaluateColdStartTest(db, testId, {
      forceFail: true,
      reason: "Admin dừng test thủ công."
    });
  }

  return { ok: false, error: "Action không hợp lệ." };
}

export async function updateColdStartStatusAction(
  testId: string,
  status: ColdStartStatus
) {
  const db = createAdminClient();
  await db
    .from("cold_start_tests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", testId);
  return { ok: true };
}
