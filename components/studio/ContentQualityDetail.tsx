"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { QualityHistoryTimeline } from "@/components/studio/QualityHistoryTimeline";
import { StudioContentQualityAlerts } from "@/components/studio/StudioContentQualityAlerts";
import { Button, Card } from "@/components/ui";
import {
  resubmitContentQualityReviewAction,
  submitContentQualityAppealAction
} from "@/lib/content-quality/content-quality-studio-actions";
import { qualityReasonLabel, qualityStatusLabel } from "@/lib/content-quality/labels";
import type { ContentQualityDetail } from "@/types/content-quality";

type ContentQualityDetailPanelProps = {
  detail: ContentQualityDetail;
  onClose: () => void;
  onUpdated?: () => void;
};

export function ContentQualityDetailPanel({
  detail,
  onClose,
  onUpdated
}: ContentQualityDetailPanelProps) {
  const [authorNote, setAuthorNote] = useState("");
  const [appealMessage, setAppealMessage] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleResubmit() {
    setError(null);
    startTransition(async () => {
      const result = await resubmitContentQualityReviewAction({
        acknowledged,
        authorNote,
        storyId: detail.storyId
      });

      if (!result.ok) {
        setError(result.error ?? "Không gửi được.");
        return;
      }

      onUpdated?.();
      onClose();
    });
  }

  function handleAppeal() {
    setError(null);
    startTransition(async () => {
      const result = await submitContentQualityAppealAction({
        message: appealMessage,
        storyId: detail.storyId
      });

      if (!result.ok) {
        setError(result.error ?? "Không gửi được khiếu nại.");
        return;
      }

      onUpdated?.();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <Card className="max-h-[92vh] w-full max-w-2xl overflow-y-auto p-4 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">{detail.title}</h2>
            <p className="mt-1 text-sm text-zinc-400">
              {qualityStatusLabel(detail.qualityStatus)} · Lần cảnh báo{" "}
              {detail.attemptCount}/3
            </p>
          </div>
          <button
            className="rounded-lg px-2 py-1 text-sm text-zinc-400 hover:bg-white/10"
            onClick={onClose}
            type="button"
          >
            Đóng
          </button>
        </div>

        {detail.warningMessage ? (
          <p className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
            {detail.warningMessage}
          </p>
        ) : null}

        {detail.monetizationDisabled ? (
          <p className="mb-4 rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
            Kiếm tiền cho truyện này đã bị tắt. Doanh thu đã phát sinh trước đó vẫn được giữ.
          </p>
        ) : null}

        <StudioContentQualityAlerts impact={detail.monetizationImpact} />

        <section className="mb-4 space-y-2">
          <h3 className="text-sm font-bold text-white">Lý do</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-300">
            {detail.reasonCodes.map((code) => (
              <li key={code}>{qualityReasonLabel(code)}</li>
            ))}
          </ul>
        </section>

        {detail.signalSnapshot ? (
          <section className="mb-4 space-y-2">
            <h3 className="text-sm font-bold text-white">Tín hiệu dữ liệu</h3>
            <ul className="space-y-1 text-sm text-zinc-400">
              <li>Báo cáo hợp lệ: {detail.signalSnapshot.validReportCount}</li>
              <li>
                Báo cáo từ tài khoản đáng tin:{" "}
                {detail.signalSnapshot.trustedReportCount}
              </li>
              {detail.signalSnapshot.earlyDropRate !== null ? (
                <li>
                  Tỷ lệ bỏ đọc sớm:{" "}
                  {Math.round(detail.signalSnapshot.earlyDropRate * 100)}%
                </li>
              ) : null}
              {detail.signalSnapshot.continueReadRate !== null ? (
                <li>
                  Tỷ lệ đọc tiếp:{" "}
                  {Math.round(detail.signalSnapshot.continueReadRate * 100)}%
                </li>
              ) : null}
              {detail.signalSnapshot.completenessIssues.length > 0 ? (
                <li>
                  Hoàn thiện: {detail.signalSnapshot.completenessIssues.join(", ")}
                </li>
              ) : null}
            </ul>
          </section>
        ) : null}

        {detail.moderatorNote ? (
          <section className="mb-4">
            <h3 className="text-sm font-bold text-white">Ghi chú moderator</h3>
            <p className="mt-1 text-sm text-zinc-300">{detail.moderatorNote}</p>
          </section>
        ) : null}

        <section className="mb-4 space-y-2">
          <h3 className="text-sm font-bold text-white">Việc cần làm</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-300">
            {detail.recommendedActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </section>

        <section className="mb-4">
          <h3 className="mb-2 text-sm font-bold text-white">Lịch sử xử lý</h3>
          <QualityHistoryTimeline history={detail.history} />
        </section>

        {detail.canResubmit ? (
          <section className="mb-4 space-y-3 rounded-xl border border-white/10 p-3">
            <h3 className="text-sm font-bold text-white">Gửi xét duyệt lại</h3>
            <textarea
              className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              onChange={(event) => setAuthorNote(event.target.value)}
              placeholder="Mô tả phần bạn đã sửa (ít nhất 20 ký tự)…"
              rows={4}
              value={authorNote}
            />
            <label className="flex items-start gap-2 text-sm text-zinc-300">
              <input
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
                type="checkbox"
              />
              Tôi đã đọc lý do cảnh báo và đã chỉnh nội dung.
            </label>
            <Button disabled={pending} onClick={handleResubmit} type="button">
              Gửi xét duyệt lại
            </Button>
          </section>
        ) : null}

        {detail.canAppeal ? (
          <section className="mb-4 space-y-3 rounded-xl border border-white/10 p-3">
            <h3 className="text-sm font-bold text-white">Khiếu nại (một lần)</h3>
            <p className="text-xs text-zinc-500">
              Khiếu nại không tự khôi phục truyện. Admin/moderator sẽ quyết định.
            </p>
            <textarea
              className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              onChange={(event) => setAppealMessage(event.target.value)}
              placeholder="Giải thích lý do khiếu nại…"
              rows={4}
              value={appealMessage}
            />
            <Button
              disabled={pending}
              onClick={handleAppeal}
              type="button"
              variant="secondary"
            >
              Gửi khiếu nại
            </Button>
          </section>
        ) : null}

        {error ? <p className="mb-3 text-sm text-rose-300">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <Link href={detail.editHref}>
            <Button type="button" variant="secondary">
              Sửa nội dung
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
