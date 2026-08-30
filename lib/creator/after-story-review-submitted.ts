"use server";

import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications/create-notification";
import { invalidateStoryCatalogCache } from "@/lib/stories/getPublicStoriesCatalogCached";
import { studioPath } from "@/lib/studio/constants";

export async function afterStorySubmittedForReview(input: {
  userId: string;
  storyId: string;
  storyTitle: string;
}) {
  await createNotification(input.userId, "milestone_achieved", {
    title: "Đã đăng truyện",
    body: `Truyện "${input.storyTitle}" đã được gửi cho đội ngũ kiểm duyệt. Bạn sẽ nhận thông báo khi có kết quả.`,
    actionUrl: studioPath(`/stories/${input.storyId}/edit`),
    targetType: "story",
    targetId: input.storyId,
    dedupeWindowMinutes: 5,
    metadata: { story_id: input.storyId, event: "story_submitted_for_review" }
  });

  revalidatePath("/admin/content");
  revalidatePath("/admin");
  revalidatePath(studioPath("/stories"));
  invalidateStoryCatalogCache();
}
