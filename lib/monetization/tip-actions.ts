"use server";

import { sendSupportAction } from "@/lib/monetization/tips";

export async function submitSupportAction(
  _prevState: { ok: boolean; error: string | null },
  formData: FormData
) {
  void _prevState;
  return sendSupportAction({
    toCreatorUserId: String(formData.get("to_creator_user_id") ?? ""),
    storyId: (formData.get("story_id") as string) || null,
    chapterId: (formData.get("chapter_id") as string) || null,
    giftId: (formData.get("gift_id") as string) || null,
    tipCoinAmount: Number(formData.get("tip_coin_amount") ?? 0),
    message: String(formData.get("message") ?? ""),
    isAnonymous: String(formData.get("is_anonymous") ?? "false") === "true",
    requestId: String(formData.get("request_id") ?? "")
  });
}
