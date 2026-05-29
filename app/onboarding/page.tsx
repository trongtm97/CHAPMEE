import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { saveOnboardingState } from "@/lib/supabase/onboarding";
import type { OnboardingRolePreference } from "@/types/onboarding";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { user, profile } = await getCurrentUser();

  if (!user) redirect("/login?next=/onboarding");
  if (profile?.onboarding_completed) redirect("/swipe");

  return (
    <OnboardingFlow
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
        redirect(rolePreference === "author" ? "/studio/setup" : "/swipe");
      }}
    />
  );
}
