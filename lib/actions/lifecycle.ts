"use server";

import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import {
  dismissLifecycleNudge,
  markLifecycleNudgeShown
} from "@/lib/supabase/lifecycle";
import type { LifecycleNudgeKey } from "@/types/lifecycle";

export async function markLifecycleNudgeShownAction(nudgeKey: LifecycleNudgeKey) {
  const { user } = await getCurrentProfile();
  if (!user) return;
  await markLifecycleNudgeShown(user.id, nudgeKey);
}

export async function dismissLifecycleNudgeAction(nudgeKey: LifecycleNudgeKey) {
  const { user } = await getCurrentProfile();
  if (!user) return;
  await dismissLifecycleNudge(user.id, nudgeKey);
}
