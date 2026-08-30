"use client";

import { useEffect, useMemo } from "react";
import { validateComposerContent } from "@/lib/composer/validate-composer-content";
import { presentationModeToComposerMode } from "@/lib/composer/modes";
import type { ComposerStructuredContent, ComposerValidationReport } from "@/lib/composer/types";
import type { PresentationMode } from "@/types/presentation";
import { ComposerWarningsConsentNotice } from "@/components/legal/ImplicitConsentNotice";
import { Button } from "@/components/ui";

type ComposerPublishingCheckProps = {
  composerDocument: ComposerStructuredContent;
  presentationMode: PresentationMode;
  contentWarningsConfirmed?: boolean;
  previewViewed?: boolean;
  knownMediaIds?: string[];
  onAckWarningsChange?: (acknowledged: boolean) => void;
  /** @deprecated Warnings no longer require a checkbox — publish implies consent. */
  onScrollToBlock?: (blockId: string) => void;
  disabled?: boolean;
};

type ChecklistRow = {
  id: string;
  label: string;
  status: "ok" | "error" | "warning" | "pending";
  detail?: string;
};

function IssueList({
  issues,
  tone,
  onScrollToBlock
}: {
  issues: ComposerValidationReport["errors"];
  tone: "error" | "warning" | "info";
  onScrollToBlock?: (blockId: string) => void;
}) {
  if (issues.length === 0) {
    return null;
  }

  const colors =
    tone === "error"
      ? "border-rose-400/30 text-rose-100"
      : tone === "warning"
        ? "border-amber-400/30 text-amber-100"
        : "border-cyan-400/30 text-cyan-100";

  return (
    <ul className={`mt-2 space-y-1 rounded-lg border px-3 py-2 text-xs ${colors}`}>
      {issues.map((issue, index) => (
        <li key={`${issue.code}-${index}`}>
          {issue.blockId && onScrollToBlock ? (
            <button
              className="text-left underline-offset-2 hover:underline"
              onClick={() => onScrollToBlock(issue.blockId!)}
              type="button"
            >
              {issue.message}
            </button>
          ) : (
            issue.message
          )}
        </li>
      ))}
    </ul>
  );
}

export function ComposerPublishingCheck({
  composerDocument,
  contentWarningsConfirmed = true,
  disabled = false,
  knownMediaIds = [],
  onAckWarningsChange,
  onScrollToBlock,
  previewViewed = false,
  presentationMode
}: ComposerPublishingCheckProps) {
  const mode = presentationModeToComposerMode(presentationMode);

  const report = useMemo(
    () =>
      validateComposerContent(mode, composerDocument, {
        strictPublish: true,
        knownMediaIds: new Set(knownMediaIds),
        storyContentWarningsConfirmed: contentWarningsConfirmed,
        previewViewed
      }),
    [
      composerDocument,
      contentWarningsConfirmed,
      knownMediaIds,
      mode,
      previewViewed
    ]
  );

  useEffect(() => {
    onAckWarningsChange?.(true);
  }, [onAckWarningsChange]);

  const checklist = useMemo((): ChecklistRow[] => {
    const rows: ChecklistRow[] = [
      {
        id: "valid",
        label: "Nội dung hợp lệ (schema Composer v1)",
        status: report.valid ? "ok" : "error",
        detail: report.valid ? undefined : `${report.errors.length} lỗi`
      },
      {
        id: "blocks",
        label: "Không có block lỗi nghiêm trọng",
        status: report.errors.some((e) => e.code.startsWith("BLOCK"))
          ? "error"
          : report.errors.length > 0
            ? "error"
            : "ok"
      },
      {
        id: "media",
        label: "Media hợp lệ (media_id nội bộ)",
        status: report.errors.some((e) => e.code.includes("IMAGE") || e.code.includes("MEDIA"))
          ? "error"
          : "ok"
      },
      {
        id: "warnings",
        label: "Cảnh báo nội dung truyện",
        status: contentWarningsConfirmed ? "ok" : "error",
        detail: contentWarningsConfirmed ? undefined : "Chưa xác nhận trên truyện"
      },
      {
        id: "mode",
        label: "Mode/chương phù hợp",
        status: report.errors.some((e) => e.code.includes("MODE") || e.code.includes("BRANCH"))
          ? "error"
          : "ok"
      },
      {
        id: "preview",
        label: "Preview sẵn sàng",
        status: previewViewed ? "ok" : "warning",
        detail: previewViewed ? undefined : "Nên mở tab Xem trước hoặc mobile preview"
      }
    ];

    if (report.warnings.length > 0) {
      rows.push({
        id: "composer-warnings",
        label: "Cảnh báo Composer",
        status: "warning",
        detail: `${report.warnings.length} cảnh báo — xem trước khi đăng`
      });
    }

    return rows;
  }, [contentWarningsConfirmed, previewViewed, report]);

  const ready = report.valid;

  return (
    <div className="space-y-4 rounded-2xl border border-cyan-400/25 bg-cyan-950/20 p-4">
      <div>
        <h3 className="text-sm font-bold text-cyan-100">Kiểm tra trước xuất bản (Composer)</h3>
        <p className="mt-1 text-xs text-zinc-400">
          {report.stats.block_count} block · {report.stats.media_count} ảnh ·{" "}
          {report.stats.empty_blocks} block trống
        </p>
      </div>

      <ul className="space-y-2">
        {checklist.map((row) => (
          <li
            className="flex items-start justify-between gap-2 text-sm"
            key={row.id}
          >
            <span className="text-zinc-200">{row.label}</span>
            <span
              className={
                row.status === "ok"
                  ? "text-emerald-300"
                  : row.status === "error"
                    ? "text-rose-300"
                    : row.status === "warning"
                      ? "text-amber-300"
                      : "text-zinc-500"
              }
            >
              {row.status === "ok"
                ? "✓"
                : row.status === "error"
                  ? "✗"
                  : row.status === "warning"
                    ? "!"
                    : "…"}
              {row.detail ? ` · ${row.detail}` : ""}
            </span>
          </li>
        ))}
      </ul>

      <IssueList issues={report.errors} onScrollToBlock={onScrollToBlock} tone="error" />
      <IssueList issues={report.warnings} onScrollToBlock={onScrollToBlock} tone="warning" />
      <IssueList issues={report.info} tone="info" />

      {report.valid && report.warnings.length > 0 ? (
        <ComposerWarningsConsentNotice />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
        <p
          className={`text-sm font-semibold ${
            ready ? "text-emerald-300" : report.valid ? "text-amber-300" : "text-rose-300"
          }`}
        >
          {ready ? "Sẵn sàng gửi duyệt" : "Chưa thể gửi duyệt — sửa lỗi trước"}
        </p>
        <Button
          disabled={disabled}
          onClick={() => {
            const el = document.querySelector("[data-composer-block-list]");
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          type="button"
          variant="ghost"
        >
          Tới danh sách block
        </Button>
      </div>
    </div>
  );
}

export function useComposerPublishGate(report: ComposerValidationReport) {
  return {
    canSubmitReview: report.valid,
    hasErrors: !report.valid,
    hasWarnings: report.warnings.length > 0
  };
}
