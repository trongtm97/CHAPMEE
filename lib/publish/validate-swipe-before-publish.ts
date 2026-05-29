import { createRule, summarizeChecklist } from "@/lib/publish/checklist-utils";
import {
  SWIPE_BODY_MAX,
  SWIPE_CTA_MAX,
  SWIPE_HOOK_MAX,
  type SwipeFormValues
} from "@/types/swipe";
import type { PublishChecklistResult } from "@/types/publish-checklist";
import { SWIPE_BODY_MIN_CHARS } from "@/types/publish-checklist";

export type SwipePublishInput = Partial<SwipeFormValues> & {
  /** Chỉ set khi đã kiểm tra server; undefined = bỏ qua trên client. */
  linkedContentPublic?: boolean;
};

export function validateSwipeBeforePublish(
  swipe: SwipePublishInput
): PublishChecklistResult {
  const hook = swipe.hook?.trim() ?? "";
  const body = swipe.body?.trim() ?? "";
  const cta = swipe.cta?.trim() ?? "";
  const storyId = swipe.storyId?.trim() ?? "";
  const linkedOk =
    swipe.linkedContentPublic === undefined ? true : swipe.linkedContentPublic;

  const rules = [
    createRule({
      blocking: true,
      id: "story",
      label: "Thiếu truyện liên kết",
      message: "Chọn truyện liên kết trước khi đăng Swipe.",
      ok: Boolean(storyId),
      targetType: "swipe"
    }),
    createRule({
      blocking: true,
      id: "hook",
      label: "Thiếu hook",
      message: "Hook không được để trống.",
      ok: Boolean(hook),
      targetType: "swipe"
    }),
    createRule({
      blocking: true,
      id: "body",
      label: "Thiếu nội dung",
      message: "Nội dung Swipe không được để trống.",
      ok: Boolean(body),
      targetType: "swipe"
    }),
    createRule({
      blocking: true,
      id: "hook-length",
      label: "Hook quá dài",
      message: `Hook tối đa ${SWIPE_HOOK_MAX} ký tự.`,
      ok: hook.length <= SWIPE_HOOK_MAX,
      targetType: "swipe"
    }),
    createRule({
      blocking: true,
      id: "body-length",
      label: "Nội dung quá dài",
      message: `Nội dung tối đa ${SWIPE_BODY_MAX} ký tự.`,
      ok: body.length <= SWIPE_BODY_MAX,
      targetType: "swipe"
    }),
    createRule({
      blocking: true,
      id: "cta-length",
      label: "CTA quá dài",
      message: `CTA tối đa ${SWIPE_CTA_MAX} ký tự.`,
      ok: cta.length <= SWIPE_CTA_MAX,
      targetType: "swipe"
    }),
    createRule({
      blocking: true,
      id: "linked-public",
      label: "Truyện/chương liên kết chưa public",
      message: "Truyện hoặc chương liên kết phải đang public trước khi đăng Swipe.",
      ok: linkedOk,
      targetType: "swipe"
    }),
    createRule({
      id: "background",
      label: "Chưa chọn hình nền",
      message: "Thêm hình nền giúp Swipe nổi bật hơn.",
      ok: Boolean(swipe.backgroundImageUrl?.trim()),
      targetType: "swipe",
      warnIfFail: true
    }),
    createRule({
      id: "cta-empty",
      label: "CTA trống",
      message: "Thêm lời kêu gọi hành động (CTA) để tăng tương tác.",
      ok: Boolean(cta),
      targetType: "swipe",
      warnIfFail: true
    }),
    createRule({
      id: "body-short",
      label: "Nội dung quá ngắn",
      message: `Nội dung Swipe nên dài hơn ${SWIPE_BODY_MIN_CHARS} ký tự.`,
      ok: body.length >= SWIPE_BODY_MIN_CHARS,
      targetType: "swipe",
      warnIfFail: true
    }),
    createRule({
      id: "hook-style",
      label: "Hook chưa nổi bật",
      message: "Hook nên ngắn gọn, gây tò mò — xem lại cách mở đầu.",
      ok: hook.length >= 12,
      targetType: "swipe",
      warnIfFail: true
    })
  ];

  return summarizeChecklist(rules);
}
