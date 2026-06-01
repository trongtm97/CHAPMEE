"use client";

import Link from "next/link";
import { Button, Card } from "@/components/ui";
import {
  StoryCreateChecklist,
  type StoryCreateChecklistItem
} from "@/components/studio/stories/create/StoryCreateChecklist";
import type { StoryFormIntent } from "@/lib/creator/storyFormValidation";
import type { StoryCreateFieldIssue, StoryCreateStepId } from "@/lib/studio/story-create-validation";
import type { StoryStructureType } from "@/types/story-structure";

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
  structureType?: StoryStructureType;
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
  structureType = "chaptered",
  visibility
}: StoryCreateSidebarProps) {
  const errors = showValidationErrors
    ? issues.filter((issue) => issue.level === "error")
    : [];
  const isPublishStep = step === "publish";

  return (
    <aside className="space-y-3 xl:sticky xl:top-4 xl:self-start">
      <Card className="space-y-2 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
          Trạng thái
        </p>
        <div className="flex flex-wrap gap-1.5 text-xs">
          <span className="rounded-full bg-amber-400/15 px-2 py-0.5 font-semibold text-amber-100">
            {autosaveLabel ? "Đã lưu nháp" : "Nháp mới"}
          </span>
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-300">
            {visibility === "public" ? "Công khai sau duyệt" : "Riêng tư"}
          </span>
        </div>
        <p className="text-xs text-zinc-500">
          {dirty ? "Có thay đổi chưa lưu" : "Chưa có thay đổi"}
          {autosaveLabel ? ` · ${autosaveLabel}` : ""}
        </p>
      </Card>

      <Card className="p-3">
        <StoryCreateChecklist items={checklist} />
      </Card>

      {errors.length > 0 ? (
        <Card className="space-y-1.5 p-3">
          <p className="text-xs font-bold text-rose-300">Cần sửa</p>
          <ul className="space-y-1">
            {errors.slice(0, 4).map((issue) => (
              <li className="text-xs text-rose-200/90" key={`${issue.field}-e`}>
                {issue.message}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="space-y-2 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
          Hành động
        </p>
        {disableReason ? (
          <p className="text-xs text-amber-200/90">{disableReason}</p>
        ) : null}
        <Button
          className="w-full"
          disabled={pending}
          loading={pending}
          onClick={() => onAction("draft")}
          type="button"
          variant="secondary"
        >
          Lưu nháp
        </Button>
        {isPublishStep ? (
          <>
            <Button
              className="w-full"
              disabled={pending || Boolean(disableReason)}
              loading={pending}
              onClick={() => onAction("create")}
              type="button"
            >
              Tạo truyện
            </Button>
            {structureType === "chaptered" ? (
              <Button
                className="w-full"
                disabled={pending || Boolean(disableReason)}
                loading={pending}
                onClick={() => onAction("create_and_chapter")}
                type="button"
                variant="secondary"
              >
                Tạo & viết ngay
              </Button>
            ) : (
              <Button
                className="w-full"
                disabled={pending || Boolean(disableReason)}
                loading={pending}
                onClick={() => onAction("create")}
                type="button"
                variant="secondary"
              >
                Tạo & soạn nội dung
              </Button>
            )}
            <Button
              className="w-full border border-amber-400/30 bg-amber-400/10 text-amber-50 hover:bg-amber-400/20"
              disabled={pending || Boolean(disableReason)}
              loading={pending}
              onClick={() => onAction("review")}
              type="button"
              variant="secondary"
            >
              Gửi duyệt
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
