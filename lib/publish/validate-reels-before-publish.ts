import { createRule, summarizeChecklist } from "@/lib/publish/checklist-utils";
import {
  REELS_BODY_MAX,
  REELS_CTA_MAX,
  REELS_HOOK_MAX,
  type ReelsFormValues
} from "@/types/reels";
import type { PublishChecklistResult } from "@/types/publish-checklist";
import { REELS_BODY_MIN_CHARS } from "@/types/publish-checklist";

export type ReelsPublishInput = Partial<ReelsFormValues> & {
  /** Chỉ set khi đã kiểm tra server; undefined = bỏ qua trên client. */
  linkedContentPublic?: boolean;
};

export function validateReelsBeforePublish(
  reelsInput: ReelsPublishInput
): PublishChecklistResult {
  const hook = reelsInput.hook?.trim() ?? "";
  const body = reelsInput.body?.trim() ?? "";
  const cta = reelsInput.cta?.trim() ?? "";
  const storyId = reelsInput.storyId?.trim() ?? "";
  const linkedOk =
    reelsInput.linkedContentPublic === undefined ? true : reelsInput.linkedContentPublic;

  const rules = [
    createRule({
      blocking: true,
      id: "story",
      label: "Thiếu truyện liên kết",
      message: "Chọn truyện liên kết trước khi đăng Reels.",
      ok: Boolean(storyId),
      targetType: "reels"
    }),
    createRule({
      blocking: true,
      id: "hook",
      label: "Thiếu hook",
      message: "Hook không được để trống.",
      ok: Boolean(hook),
      targetType: "reels"
    }),
    createRule({
      blocking: true,
      id: "body",
      label: "Thiếu nội dung",
      message: "Nội dung Reels không được để trống.",
      ok: Boolean(body),
      targetType: "reels"
    }),
    createRule({
      blocking: true,
      id: "hook-length",
      label: "Hook quá dài",
      message: `Hook tối đa ${REELS_HOOK_MAX} ký tự.`,
      ok: hook.length <= REELS_HOOK_MAX,
      targetType: "reels"
    }),
    createRule({
      blocking: true,
      id: "body-length",
      label: "Nội dung quá dài",
      message: `Nội dung tối đa ${REELS_BODY_MAX} ký tự.`,
      ok: body.length <= REELS_BODY_MAX,
      targetType: "reels"
    }),
    createRule({
      blocking: true,
      id: "cta-length",
      label: "CTA quá dài",
      message: `CTA tối đa ${REELS_CTA_MAX} ký tự.`,
      ok: cta.length <= REELS_CTA_MAX,
      targetType: "reels"
    }),
    createRule({
      blocking: true,
      id: "linked-public",
      label: "Truyện/chương liên kết chưa public",
      message: "Truyện hoặc chương liên kết phải đang public trước khi đăng Reels.",
      ok: linkedOk,
      targetType: "reels"
    }),
    createRule({
      id: "background",
      label: "Chưa chọn hình nền",
      message: "Thêm hình nền giúp Reels nổi bật hơn.",
      ok: Boolean(reelsInput.backgroundImageUrl?.trim()),
      targetType: "reels",
      warnIfFail: true
    }),
    createRule({
      id: "cta-empty",
      label: "CTA trống",
      message: "Thêm lời kêu gọi hành động (CTA) để tăng tương tác.",
      ok: Boolean(cta),
      targetType: "reels",
      warnIfFail: true
    }),
    createRule({
      id: "body-short",
      label: "Nội dung quá ngắn",
      message: `Nội dung Reels nên dài hơn ${REELS_BODY_MIN_CHARS} ký tự.`,
      ok: body.length >= REELS_BODY_MIN_CHARS,
      targetType: "reels",
      warnIfFail: true
    }),
    createRule({
      id: "hook-style",
      label: "Hook chưa nổi bật",
      message: "Hook nên ngắn gọn, gây tò mò — xem lại cách mở đầu.",
      ok: hook.length >= 12,
      targetType: "reels",
      warnIfFail: true
    })
  ];

  return summarizeChecklist(rules);
}
