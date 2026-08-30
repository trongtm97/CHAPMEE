"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { VerificationConsentNotice } from "@/components/legal/ImplicitConsentNotice";
import { Button } from "@/components/ui";
import { STUDIO_VERIFICATION_TYPES, type StudioVerificationType } from "@/lib/verification/config";
import {
  listVerificationDocumentsAction,
  submitVerificationRequestAction
} from "@/lib/verification/verification-document-actions";
import { VerificationBadgePreview } from "@/components/studio/verification/VerificationBadgePreview";
import { VerificationStatusCard } from "@/components/studio/verification/VerificationStatusCard";
import { VerificationTypePicker } from "@/components/studio/verification/VerificationTypePicker";
import { VerificationUploadList } from "@/components/studio/verification/VerificationUploadList";
import type { UserVerificationSummary, VerificationDocumentRow } from "@/types/verification";

type StudioVerificationCenterProps = {
  displayName: string;
  summary: UserVerificationSummary;
};

export function StudioVerificationCenter({ displayName, summary }: StudioVerificationCenterProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [verificationType, setVerificationType] = useState<StudioVerificationType>("payout_individual");
  const [requestReason, setRequestReason] = useState("");
  const [documents, setDocuments] = useState<VerificationDocumentRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const uploadSessionId = useMemo(() => crypto.randomUUID(), []);
  const supplementRequestId = summary.latestNeedsMoreInfo?.id ?? null;
  const formDisabled = Boolean(summary.latestPending) || !summary.requestsEnabled;
  const canSubmitForm =
    !formDisabled && requestReason.trim().length >= 20 && showForm;

  useEffect(() => {
    if (!showForm && !supplementRequestId) {
      return;
    }

    startTransition(async () => {
      const result = await listVerificationDocumentsAction({
        requestId: supplementRequestId,
        uploadSessionId: supplementRequestId ? undefined : uploadSessionId
      });
      if (result.documents) {
        setDocuments(result.documents);
      }
    });
  }, [showForm, supplementRequestId, uploadSessionId]);

  function openForm(mode: "start" | "supplement" | "resubmit") {
    setShowForm(true);
    setMessage(null);
    setError(null);
    if (mode === "supplement" && summary.latestNeedsMoreInfo) {
      setVerificationType(
        STUDIO_VERIFICATION_TYPES.includes(
          summary.latestNeedsMoreInfo.verification_type as StudioVerificationType
        )
          ? (summary.latestNeedsMoreInfo.verification_type as StudioVerificationType)
          : "payout_individual"
      );
      setRequestReason(summary.latestNeedsMoreInfo.request_reason ?? "");
    }
    if (mode === "resubmit") {
      setRequestReason("");
      setDocuments([]);
    }
  }

  function handleSubmit() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await submitVerificationRequestAction({
        consent: true,
        requestId: supplementRequestId,
        requestReason,
        uploadSessionId,
        verificationType
      });

      if (!result.ok) {
        setError(result.error ?? "Không thể gửi yêu cầu.");
        return;
      }

      setMessage("Yêu cầu xác thực đã được gửi. ChapMee sẽ xét duyệt thủ công.");
      setShowForm(false);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0 space-y-6">
        <VerificationStatusCard
          onResubmit={() => openForm("resubmit")}
          onStart={() => openForm("start")}
          onSupplement={() => openForm("supplement")}
          summary={summary}
        />

        <div className="rounded-2xl border border-amber-400/25 bg-amber-400/5 px-4 py-3 text-sm text-amber-100">
          Giấy tờ xác thực chỉ dùng cho xét duyệt nội bộ ChapMee, không hiển thị công khai.
        </div>

        {!summary.requestsEnabled && !summary.publicBadge ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-400">
            Hệ thống chưa mở gửi yêu cầu tự phục vụ. Vui lòng quay lại sau hoặc liên hệ qua Trung
            tâm hỗ trợ trong ChapMee.
          </div>
        ) : null}

        {(showForm && !summary.latestPending) ? (
          <div className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
            <VerificationTypePicker
              disabled={formDisabled || Boolean(supplementRequestId)}
              onChange={setVerificationType}
              value={verificationType}
            />

            <VerificationUploadList
              disabled={formDisabled || pending}
              documents={documents}
              onDocumentsChange={setDocuments}
              onError={setError}
              requestId={supplementRequestId}
              uploadSessionId={uploadSessionId}
              verificationType={verificationType}
            />

            <div className="space-y-3 border-t border-white/5 pt-5">
              <p className="text-sm font-semibold text-white">Bước 3 · Ghi chú & xác nhận</p>
              <label className="block space-y-2 text-sm">
                <span className="text-zinc-300">Lý do xác thực</span>
                <textarea
                  className="min-h-28 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white"
                  disabled={formDisabled || pending}
                  onChange={(event) => setRequestReason(event.target.value)}
                  placeholder="Mô tả ngắn lý do bạn cần xác thực và thông tin giúp admin đối chiếu..."
                  value={requestReason}
                />
              </label>
            </div>

            <div className="border-t border-white/5 pt-5">
              <p className="mb-3 text-sm font-semibold text-white">Bước 4 · Gửi yêu cầu</p>
              <VerificationConsentNotice className="mb-3 text-sm leading-relaxed text-zinc-400" />
              <Button
                className="min-h-10 w-full sm:w-auto"
                disabled={!canSubmitForm || pending}
                loading={pending}
                onClick={handleSubmit}
                type="button"
              >
                Gửi yêu cầu
              </Button>
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            {message}
          </p>
        ) : null}
      </div>

      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <VerificationBadgePreview displayName={displayName} summary={summary} />
      </aside>
    </div>
  );
}
