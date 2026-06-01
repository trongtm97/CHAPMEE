import { getFeaturedTaxonomyTerms } from "@/lib/taxonomy/queries";

export type OnboardingGenreOption = {
  slug: string;
  name: string;
};

/** Featured main_genre terms for onboarding — no hard-coded Vietnamese list. */
export async function getOnboardingGenreOptions(): Promise<{
  options: OnboardingGenreOption[];
  error: string | null;
}> {
  const result = await getFeaturedTaxonomyTerms("main_genre", {
    discoverOnly: true,
    limit: 16
  });

  if (result.error) {
    return { options: [], error: result.error };
  }

  if (result.data.length > 0) {
    return {
      options: result.data.map((term) => ({
        slug: term.slug,
        name: term.display_label ?? term.name
      })),
      error: null
    };
  }

  const fallback = await getFeaturedTaxonomyTerms("main_genre", { limit: 12 });
  return {
    options: fallback.data.map((term) => ({
      slug: term.slug,
      name: term.display_label ?? term.name
    })),
    error: fallback.error
  };
}
