import { createNotification } from "@/lib/notifications/create-notification";
import { studioPath } from "@/lib/studio/constants";

export async function notifyCreatorTaxonomyRevisionRequested(input: {
  creatorUserId: string;
  storyId: string;
  storyTitle: string;
  reason: string;
  requestId: string;
}) {
  await createNotification(input.creatorUserId, "taxonomy_revision_requested", {
    title: "Cần chỉnh phân loại truyện",
    body: `Admin yêu cầu bạn cập nhật thể loại/tag/cảnh báo cho "${input.storyTitle}". ${input.reason}`,
    targetType: "story",
    targetId: input.storyId,
    actionUrl: studioPath("/content-health"),
    metadata: {
      requestId: input.requestId,
      storyTitle: input.storyTitle
    },
    dedupeWindowMinutes: 60
  });
}

export async function notifyCreatorTaxonomyRevisionReviewed(input: {
  creatorUserId: string;
  storyId: string;
  storyTitle: string;
  approved: boolean;
}) {
  await createNotification(input.creatorUserId, "taxonomy_revision_requested", {
    title: input.approved
      ? "Phân loại truyện đã được duyệt"
      : "Cần chỉnh lại phân loại truyện",
    body: input.approved
      ? `"${input.storyTitle}" — admin đã duyệt phân loại sau khi bạn chỉnh sửa.`
      : `"${input.storyTitle}" — admin yêu cầu chỉnh lại phân loại. Xem Content Health để biết chi tiết.`,
    targetType: "story",
    targetId: input.storyId,
    actionUrl: studioPath("/content-health"),
    metadata: { approved: input.approved, storyTitle: input.storyTitle },
    mergeMode: "update",
    dedupeWindowMinutes: 30
  });
}
