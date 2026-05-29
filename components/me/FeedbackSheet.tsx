"use client";

import { useActionState, useEffect } from "react";
import { submitFeedbackAction } from "@/lib/actions/feedback-actions";
import { INITIAL_SUBMIT_FEEDBACK_STATE } from "@/lib/actions/feedback-state";
import { Button, Card, Input, Textarea } from "@/components/ui";
import type { FeedbackCategory } from "@/types/contact-settings";

type FeedbackSheetProps = {
  onClose: () => void;
  userEmail?: string | null;
};

const categoryOptions: { value: FeedbackCategory; label: string }[] = [
  { value: "feedback", label: "Góp ý chung" },
  { value: "bug", label: "Báo lỗi" },
  { value: "feature", label: "Đề xuất tính năng" }
];

export function FeedbackSheet({ onClose, userEmail }: FeedbackSheetProps) {
  const [state, formAction, pending] = useActionState(
    submitFeedbackAction,
    INITIAL_SUBMIT_FEEDBACK_STATE
  );

  useEffect(() => {
    if (state.ok) {
      const timer = window.setTimeout(onClose, 1200);
      return () => window.clearTimeout(timer);
    }
  }, [state.ok, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:justify-center"
      role="presentation"
      onClick={onClose}
    >
      <Card
        className="w-full max-h-[88vh] space-y-4 overflow-y-auto rounded-[1.5rem] p-4 sm:max-w-md"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-cyan-200">
              Gửi góp ý
            </p>
            <h3 className="text-lg font-black text-white">Chia sẻ với ChapMee</h3>
          </div>
          <Button onClick={onClose} type="button" variant="ghost">
            Đóng
          </Button>
        </div>

        <form action={formAction} className="space-y-3">
          <div className="space-y-2">
            <p className="text-sm font-bold text-zinc-200">Loại góp ý</p>
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map((option) => (
                <label
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-zinc-200 has-[:checked]:border-cyan-300/40 has-[:checked]:bg-cyan-300/10 has-[:checked]:text-cyan-100"
                  key={option.value}
                >
                  <input
                    className="sr-only"
                    defaultChecked={option.value === "feedback"}
                    name="category"
                    type="radio"
                    value={option.value}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <Textarea
            label="Nội dung"
            name="message"
            placeholder="Mô tả góp ý, lỗi hoặc ý tưởng của bạn..."
            required
            rows={5}
          />

          <Input
            defaultValue={userEmail ?? ""}
            label="Email liên hệ (tuỳ chọn)"
            name="contactEmail"
            placeholder="email@example.com"
            type="email"
          />

          {state.message ? (
            <p
              className={`text-sm ${
                state.ok ? "text-emerald-300" : "text-red-300"
              }`}
            >
              {state.message}
            </p>
          ) : null}

          <Button disabled={pending} type="submit">
            {pending ? "Đang gửi..." : "Gửi góp ý"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
