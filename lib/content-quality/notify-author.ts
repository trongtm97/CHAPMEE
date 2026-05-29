import { createNotification } from "@/lib/notifications/create-notification";
import { studioPath } from "@/lib/studio/constants";
import type { ContentQualityStatus } from "@/types/content-quality";
import type { NotificationType } from "@/types/notification";

export async function notifyAuthorContentQuality(input: {
  authorUserId: string;
  storyId: string;
  storyTitle: string;
  status: ContentQualityStatus;
  attemptNumber: number;
}) {
  let type: NotificationType = "content_quality_warning";
  let title = "Cảnh báo chất lượng nội dung";
  let body = `Truyện «${input.storyTitle}» cần được cải thiện.`;

  if (input.status === "permanently_hidden_low_quality") {
    type = "content_quality_permanently_hidden";
    title = "Truyện bị ẩn do chất lượng thấp";
    body = `«${input.storyTitle}» đã bị ẩn khỏi công khai sau 3 lần xác nhận chất lượng thấp. Kiếm tiền cho truyện này đã tắt.`;
  } else if (input.status === "restored") {
    type = "content_quality_restored";
    title = "Truyện đã được khôi phục";
    body = `«${input.storyTitle}» đã vượt qua xét duyệt chất lượng.`;
  } else if (
    input.status === "pending_quality_review" ||
    input.status === "appealed"
  ) {
    type = "content_quality_needs_fix";
    title = "Đang chờ xét duyệt lại";
    body = `Yêu cầu xét duyệt lại «${input.storyTitle}» đã được gửi.`;
  } else if (input.attemptNumber >= 2) {
    body = `«${input.storyTitle}» đang ở cảnh báo lần ${input.attemptNumber}. Nếu lần sau vẫn chất lượng thấp, truyện có thể bị ẩn vĩnh viễn.`;
  }

  await createNotification(input.authorUserId, type, {
    actionUrl: studioPath("/content-health"),
    body,
    targetId: input.storyId,
    targetType: "story",
    title
  });

  if (input.status === "permanently_hidden_low_quality") {
    await createNotification(input.authorUserId, "content_quality_monetization_disabled", {
      actionUrl: studioPath("/content-health"),
      body: `Kiếm tiền cho «${input.storyTitle}» đã bị tắt do chất lượng nội dung.`,
      targetId: input.storyId,
      targetType: "story",
      title: "Kiếm tiền đã tắt"
    });
  }
}
