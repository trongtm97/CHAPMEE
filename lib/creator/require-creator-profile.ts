import "server-only";

import { redirect } from "next/navigation";
import { ensureCreatorProfile } from "@/lib/creator/ensure-creator-profile";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import { getCurrentCreatorProfile } from "@/lib/creator/getCreatorProfile";

/** Requires login + creator profile (auto-created if missing). */
export async function requireCreatorProfile(
  nextPath = "/studio"
): Promise<{ user: { id: string; email?: string }; creatorProfile: CreatorProfile }> {
  const state = await getCurrentCreatorProfile();

  if (!state.user && !state.error) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (!state.user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (state.creatorProfile) {
    return { user: state.user, creatorProfile: state.creatorProfile };
  }

  const creatorProfile = await ensureCreatorProfile(state.user.id);
  if (!creatorProfile) {
    redirect(nextPath);
  }

  return { user: state.user, creatorProfile };
}
