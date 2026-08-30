import { createClient } from "@/lib/data/server";
import type { OnboardingRolePreference } from "@/types/onboarding";

export async function getOnboardingState(userId: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("profiles")
    .select("onboarding_completed, onboarding_completed_at, user_role_preference, favorite_genres, onboarding_goals")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveOnboardingState(input: {
  userId: string;
  completed: boolean;
  rolePreference: OnboardingRolePreference | null;
  favoriteGenres: string[];
  goals: string[];
}) {
  const db = await createClient();
  const { error } = await db
    .from("profiles")
    .update({
      favorite_genres: input.favoriteGenres,
      onboarding_completed: input.completed,
      onboarding_completed_at: input.completed ? new Date().toISOString() : null,
      onboarding_goals: input.goals,
      user_role_preference: input.rolePreference
    })
    .eq("id", input.userId);
  if (error) throw error;
}
