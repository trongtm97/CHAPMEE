import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/** Bump reels_items.cta_click_count for studio reporting. */
export async function incrementReelsCtaClick(input: {
  reelItemId?: string | null;
  storyId?: string | null;
  chapterId?: string | null;
}): Promise<void> {
  const reelItemId = input.reelItemId?.trim();
  const storyId = input.storyId?.trim();
  const chapterId = input.chapterId?.trim();

  if (reelItemId) {
    await db.execute(sql`
      update public.reels_items
      set cta_click_count = coalesce(cta_click_count, 0) + 1
      where id = ${reelItemId}::uuid
    `);
    return;
  }

  if (!storyId || !chapterId) {
    return;
  }

  await db.execute(sql`
    update public.reels_items
    set cta_click_count = coalesce(cta_click_count, 0) + 1
    where story_id = ${storyId}::uuid
      and chapter_id = ${chapterId}::uuid
  `);
}
