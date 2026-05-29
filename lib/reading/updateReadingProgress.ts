"use server";

import { revalidatePath } from "next/cache";
import { persistReadingProgress } from "@/lib/reading/persistReadingProgress";

type ReadingProgressInput = {
  storyId: string;
  episodeId: string;
  progressPercent: number;
  returnTo?: string;
};

export async function updateReadingProgress(input: ReadingProgressInput) {
  await persistReadingProgress({
    episodeId: input.episodeId,
    progressPercent: input.progressPercent,
    storyId: input.storyId
  });

  revalidatePath("/");
  revalidatePath("/me/library");

  if (input.returnTo) {
    revalidatePath(input.returnTo);
  }
}

export async function markReadingCompleteAction(formData: FormData) {
  const storyId = String(formData.get("storyId") ?? "");
  const episodeId = String(formData.get("episodeId") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "");

  await updateReadingProgress({
    episodeId,
    progressPercent: 100,
    returnTo,
    storyId
  });
}
