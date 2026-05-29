import { createNotification } from "@/lib/notifications/create-notification";
import { studioPath } from "@/lib/studio/constants";

export async function notifyAuthorContentQualityMonetization(input: {
  authorUserId: string;
  storyId: string;
  storyTitle: string;
  kind: "free_access" | "coin_refund";
  refundCoinTotal?: number;
  refundUserCount?: number;
}) {
  try {
    if (input.kind === "free_access") {
      await createNotification(input.authorUserId, "content_quality_free_access", {
        actionUrl: studioPath("/content-health"),
        body: `Nội dung «${input.storyTitle}» đã được mở miễn phí do quyết định chất lượng.`,
        targetId: input.storyId,
        targetType: "story",
        title: "Nội dung đã mở miễn phí"
      });
      return;
    }

    await createNotification(input.authorUserId, "content_quality_monetization_disabled", {
      actionUrl: studioPath("/content-health"),
      body: `Nội dung «${input.storyTitle}» đã hoàn coin cho ${input.refundUserCount ?? 0} người mua (${(input.refundCoinTotal ?? 0).toLocaleString("vi-VN")} coin) do quyết định chất lượng.`,
      targetId: input.storyId,
      targetType: "story",
      title: "Đã hoàn coin cho người mua"
    });
  } catch {
    // Notification system optional — do not crash.
  }
}

export async function notifyBuyerQualityCoinRefund(input: {
  userId: string;
  storyTitle: string;
  storyId: string;
  coinAmount: number;
}) {
  try {
    await createNotification(input.userId, "coin_refund_quality", {
      actionUrl: "/wallet",
      body: `Bạn đã được hoàn ${input.coinAmount.toLocaleString("vi-VN")} coin do nội dung «${input.storyTitle}» được xử lý chất lượng.`,
      targetId: input.storyId,
      targetType: "story",
      title: "Hoàn coin"
    });
  } catch {
    // Optional.
  }
}
