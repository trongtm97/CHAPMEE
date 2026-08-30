import "server-only";



import type { StoryCatalogStory } from "@/types/story";



/** Card badges and cover images — must run outside unstable_cache (no cookies/headers). */

export async function enrichStoryCatalogStories(

  stories: StoryCatalogStory[]

): Promise<StoryCatalogStory[]> {

  if (stories.length === 0) {

    return stories;

  }



  try {

    const { enrichStoriesWithAudioCardSummary } = await import("@/src/lib/audio/audio-summary");

    const { enrichStoriesWithFilmCardSummary } = await import(

      "@/src/lib/film-adaptations/film-card-summary"

    );

    const { attachCatalogStoryImages } = await import("@/lib/stories/attach-catalog-story-images");



    const withAudio = await enrichStoriesWithAudioCardSummary(stories);

    const withFilm = await enrichStoriesWithFilmCardSummary(withAudio);

    return attachCatalogStoryImages(withFilm);

  } catch (error) {

    console.error(

      "[catalog] enrich stories failed",

      error instanceof Error ? error.message : error

    );

    return stories;

  }

}

