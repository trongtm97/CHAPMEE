import { redirect } from "next/navigation";
import { getCurrentCreatorProfile } from "@/lib/creator/getCurrentCreatorProfile";

export async function getStudioAccess(nextPath = "/studio") {
  const state = await getCurrentCreatorProfile();

  if (!state.user && !state.error) {
    redirect(`/login?next=${nextPath}`);
  }

  if (state.user && !state.creatorProfile && !state.error) {
    redirect("/studio/setup");
  }

  return state;
}
