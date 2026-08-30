"use client";

import Link from "next/link";
import { PublishGuidelinesNotice } from "@/components/creator/GuidelinesSubmitAcknowledgement";
import { Button, Card } from "@/components/ui";
import {
  StoryCreateChecklist,
  type StoryCreateChecklistItem
} from "@/components/studio/stories/create/StoryCreateChecklist";
import type { StoryFormIntent } from "@/lib/creator/storyFormValidation";
import type { StoryCreateFieldIssue, StoryCreateStepId } from "@/lib/studio/story-create-validation";

type StoryCreateSidebarProps = {
  autosaveLabel: string | null;
  basePath: string;
  checklist: StoryCreateChecklistItem[];
  dirty: boolean;
  disableReason?: string | null;
  issues: StoryCreateFieldIssue[];
  onAction: (intent: StoryFormIntent) => void;
  pending: boolean;
  showValidationErrors: boolean;
  step: StoryCreateStepId;
  visibility: string;
};

export function StoryCreateSidebar({
  autosaveLabel,
  basePath,
  checklist,
  dirty,
  disableReason = null,
  issues,
  onAction,
  pending,
  showValidationErrors,
  step,
  visibility
}: StoryCreateSidebarProps) {
  const errors = showValidationErrors
    ? issues.filter((issue) => issue.level === "error")
    : [];

  return (
    <aside className="space-y-3 xl:sticky xl:top-4 xl:self-start">
      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-100">Tiến độ</h2>
          {autosaveLabel ? (
            <span className="text-[0.65rem] text-zinc-500">{autosaveLabel}</span>
          ) : dirty ? (
            <span className="text-[0.65rem] text-amber-300/80">Chưa lưu</span>
          ) : null}
        </div>
        <StoryCreateChecklist items={checklist} />
        {errors.length > 0 ? (
          <ul className="space-y-1 text-xs text-red-300">
            {errors.slice(0, 4).map((issue) => (
              <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>
            ))}
          </ul>
        ) : null}
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-zinc-100">Hành động</h2>
        <p className="text-xs text-zinc-500">
          Trạng thái: {visibility === "public" ? "Công khai" : "Nháp"} · Bước: {step}
        </p>
        <Button
          className="w-full"
          disabled={pending || Boolean(disableReason)}
          loading={pending}
          onClick={() => onAction("draft")}
          type="button"
          variant="secondary"
        >
          Lưu nháp
        </Button>
        {step === "taxonomy" ? (
          <>
            <PublishGuidelinesNotice bare variant="story" />
            <Button
              className="w-full border border-amber-400/30 bg-amber-400/10 text-amber-50 hover:bg-amber-400/20"
              disabled={pending || Boolean(disableReason)}
              loading={pending}
              onClick={() => onAction("review")}
              type="button"
              variant="secondary"
            >
              Đăng truyện
            </Button>
          </>
        ) : null}
        <Link
          className="flex min-h-9 w-full items-center justify-center text-xs font-semibold text-zinc-500 hover:text-zinc-300"
          href={`${basePath}/stories`}
        >
          Quay lại danh sách
        </Link>
      </Card>
    </aside>
  );
}
