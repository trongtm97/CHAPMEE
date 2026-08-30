import { redirect } from "next/navigation";
import { ensureCreatorProfile } from "@/lib/creator/ensure-creator-profile";
import { getCurrentCreatorProfile } from "@/lib/creator/getCreatorProfile";

export async function getStudioAccess(nextPath = "/studio") {
  const state = await getCurrentCreatorProfile();

  if (!state.user && !state.error) {
    redirect(`/login?next=${nextPath}`);
  }

  if (state.user && !state.creatorProfile) {
    const creatorProfile = await ensureCreatorProfile(state.user.id);
    return {
      ...state,
      creatorProfile: creatorProfile ?? null,
      error: creatorProfile ? null : state.error
    };
  }

  return state;
}
