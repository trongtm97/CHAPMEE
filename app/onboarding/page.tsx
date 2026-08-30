import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { REELS_PUBLIC_PATH } from "@/lib/routes/reels-paths";
import { saveOnboardingState } from "@/lib/data/onboarding";
import { getOnboardingGenreOptions } from "@/lib/taxonomy/onboarding-genres";
import type { OnboardingRolePreference } from "@/types/onboarding";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { user, profile } = await getCurrentUser();

  if (!user) redirect("/login?next=/onboarding");
  if (profile?.onboarding_completed) redirect(REELS_PUBLIC_PATH);

  const { options: genreOptions } = await getOnboardingGenreOptions();

  return (
    <OnboardingFlow
      genreOptions={genreOptions}
      initialGenres={profile?.favorite_genres ?? []}
      initialGoals={profile?.onboarding_goals ?? []}
      initialRole={(profile?.user_role_preference as OnboardingRolePreference | null) ?? null}
      onComplete={async ({ genres, goals, rolePreference }) => {
        await saveOnboardingState({
          completed: true,
          goals,
          rolePreference,
          userId: user.id,
          favoriteGenres: genres
        });
        redirect(rolePreference === "author" ? "/studio" : REELS_PUBLIC_PATH);
      }}
    />
  );
}
