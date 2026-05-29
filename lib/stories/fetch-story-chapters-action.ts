"use server";

import { getStoryChapters, type GetStoryChaptersInput } from "@/lib/stories/get-story-chapters";

export async function fetchStoryChaptersAction(input: GetStoryChaptersInput) {
  return getStoryChapters(input);
}
