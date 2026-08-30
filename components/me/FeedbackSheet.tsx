"use client";

import { useActionState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { submitFeedbackAction } from "@/lib/actions/feedback-actions";
import { INITIAL_SUBMIT_FEEDBACK_STATE } from "@/lib/actions/feedback-state";
import { FEEDBACK_TYPE_LABELS } from "@/lib/feedback/constants";
import { Button, Card, Input, Textarea } from "@/components/ui";
import type { ContactSettings, FeedbackType } from "@/types/contact-settings";

type FeedbackSheetProps = {
  onClose: () => void;
  settings: ContactSettings;
  userEmail?: string | null;
  pagePath?: string;
};

function buildPageUrl(pathname: string): string {
  if (!pathname) return "";
  if (typeof window !== "undefined") {
    return `${window.location.origin}${pathname}`;
  }
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  return base ? `${base}${pathname}` : pathname;
}

export function FeedbackSheet({
  onClose,
  settings,
  userEmail,
  pagePath
}: FeedbackSheetProps) {
  const pathname = usePathname();
  const effectivePagePath = pagePath ?? pathname;
  const [state, formAction, pending] = useActionState(
    submitFeedbackAction,
    INITIAL_SUBMIT_FEEDBACK_STATE
  );

  const categoryOptions = settings.allowedFeedbackTypes.map((type) => ({
    value: type,
    label: FEEDBACK_TYPE_LABELS[type as FeedbackType]
  }));

  const defaultCategory = categoryOptions[0]?.value ?? "other";

  useEffect(() => {
    if (state.ok) {
      const timer = window.setTimeout(onClose, 1500);
      return () => window.clearTimeout(timer);
    }
  }, [state.ok, onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:justify-center"
      onClick={onClose}
      role="presentation"
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
            <h3 className="text-lg font-black text-white">
              Gửi góp ý cho ChapMee
            </h3>
          </div>
          <Button onClick={onClose} type="button" variant="ghost">
            Đóng
          </Button>
        </div>

        <form action={formAction} className="space-y-3">
          <input name="page_path" type="hidden" value={effectivePagePath} />
          <input name="related_url" type="hidden" value={effectivePagePath ? buildPageUrl(effectivePagePath) : ""} />
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
                    defaultChecked={option.value === defaultCategory}
                    name="category"
                    type="radio"
                    value={option.value}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <Input
            label="Tiêu đề ngắn"
            maxLength={120}
            name="title"
            placeholder="Tóm tắt góp ý của bạn"
          />

          <Textarea
            label="Nội dung"
            name="message"
            placeholder="Mô tả góp ý, lỗi hoặc ý tưởng của bạn..."
            required
            rows={5}
          />

          <Input
            defaultValue={userEmail ?? ""}
            label={
              settings.requireContactEmail
                ? "Email liên hệ *"
                : "Email liên hệ (tùy chọn)"
            }
            name="contactEmail"
            placeholder="email@example.com"
            required={settings.requireContactEmail}
            type="email"
          />

          {effectivePagePath ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-zinc-500">
              Gửi từ trang: <span className="font-medium text-zinc-300">{effectivePagePath}</span>
            </p>
          ) : null}

          {settings.requireScreenshot ? (
            <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
              TODO: Upload ảnh chụp màn hình đang được phát triển. Hiện chưa thể
              gửi khi bắt buộc có ảnh.
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs leading-5 text-zinc-500">
              TODO: Upload ảnh chụp màn hình sẽ được bổ sung trong bản cập nhật
              tiếp theo.
            </div>
          )}

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
