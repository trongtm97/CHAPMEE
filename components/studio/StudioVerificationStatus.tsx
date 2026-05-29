"use client";

import { useState, useTransition } from "react";
import { Button, Card } from "@/components/ui";
import { requestVerificationAction } from "@/lib/verification/request-verification";
import { VERIFICATION_STATUS_LABELS } from "@/lib/verification/labels";
import {
  VERIFICATION_TYPES,
  VERIFICATION_TYPE_LABELS,
  type UserVerificationSummary,
  type VerificationType
} from "@/types/verification";

type StudioVerificationStatusProps = {
  summary: UserVerificationSummary;
};

export function StudioVerificationStatus({ summary }: StudioVerificationStatusProps) {
  const [verificationType, setVerificationType] = useState<VerificationType>(
    "identity_verified"
  );
  const [requestReason, setRequestReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submitRequest() {
    startTransition(async () => {
      const result = await requestVerificationAction({
        verificationType,
        requestReason
      });
      setMessage(result.error ?? "Đã gửi yêu cầu xác thực. ChapMee sẽ xem xét trong thời gian sớm nhất.");
      if (result.ok) {
        setRequestReason("");
      }
    });
  }

  const approved = summary.records.filter((row) => row.status === "approved");

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-white">Trạng thái xác thực</p>
          {summary.publicBadge ? (
            <p className="mt-2 text-sm text-emerald-200">
              Tài khoản đã xác thực:{" "}
              <span className="font-semibold text-white">{summary.publicBadge.label}</span>
            </p>
          ) : (
            <p className="mt-2 text-sm text-zinc-400">
              Tài khoản chưa có tick xanh công khai.
            </p>
          )}
        </div>

        {approved.length > 0 ? (
          <ul className="space-y-2 text-sm text-zinc-300">
            {approved.map((row) => (
              <li
                className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2"
                key={row.id}
              >
                <span className="font-semibold text-white">
                  {VERIFICATION_TYPE_LABELS[row.verification_type]}
                </span>
                <span className="text-zinc-500">
                  {" "}
                  · {row.display_badge ? "Hiển thị badge" : "Ẩn badge"}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {summary.latestPending ? (
          <p className="text-sm text-amber-200/90">
            Yêu cầu đang chờ duyệt (
            {VERIFICATION_TYPE_LABELS[summary.latestPending.verification_type]}).
          </p>
        ) : null}

        {summary.latestRejected ? (
          <p className="text-sm text-red-200/90">
            Yêu cầu gần nhất bị từ chối
            {summary.latestRejected.public_label
              ? `: ${summary.latestRejected.public_label}`
              : "."}
          </p>
        ) : null}

        {summary.latestRevoked ? (
          <p className="text-sm text-zinc-400">
            Xác thực đã bị thu hồi
            {summary.latestRevoked.revoke_reason
              ? `: ${summary.latestRevoked.revoke_reason}`
              : "."}
          </p>
        ) : null}
      </Card>

      {!summary.publicBadge &&
      summary.requestsEnabled &&
      !summary.latestPending ? (
        <Card className="space-y-4">
          <p className="text-sm font-semibold text-white">Gửi yêu cầu xác thực</p>
          <p className="text-sm leading-6 text-zinc-400">
            Mô tả ngắn lý do (không cần upload giấy tờ trong giai đoạn này). Admin ChapMee
            sẽ xem xét thủ công.
          </p>
          <label className="block space-y-2 text-sm">
            <span className="text-zinc-300">Loại xác thực</span>
            <select
              className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white"
              onChange={(event) =>
                setVerificationType(event.target.value as VerificationType)
              }
              value={verificationType}
            >
              {VERIFICATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {VERIFICATION_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2 text-sm">
            <span className="text-zinc-300">Lý do / thông tin bổ sung</span>
            <textarea
              className="min-h-28 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white"
              onChange={(event) => setRequestReason(event.target.value)}
              placeholder="Ví dụ: tài khoản chính chủ của tác giả X, liên kết trang cá nhân..."
              value={requestReason}
            />
          </label>
          <Button disabled={isPending} onClick={submitRequest} type="button">
            {isPending ? "Đang gửi..." : "Gửi yêu cầu"}
          </Button>
        </Card>
      ) : null}

      {!summary.requestsEnabled && !summary.publicBadge ? (
        <Card>
          <p className="text-sm text-zinc-400">
            Hệ thống chưa mở gửi yêu cầu tự phục vụ. Liên hệ ChapMee nếu bạn cần xác thực
            tài khoản.
          </p>
        </Card>
      ) : null}

      {message ? (
        <p className="text-sm text-cyan-200" role="status">
          {message}
        </p>
      ) : null}

      {summary.records.length > 0 ? (
        <Card className="space-y-3">
          <p className="text-sm font-semibold text-white">Lịch sử xác thực</p>
          <ul className="space-y-2">
            {summary.records.map((row) => (
              <li
                className="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300"
                key={row.id}
              >
                <p className="font-medium text-white">
                  {VERIFICATION_TYPE_LABELS[row.verification_type]}
                </p>
                <p className="text-xs text-zinc-500">
                  {VERIFICATION_STATUS_LABELS[row.status] ?? row.status}
                  {row.submitted_at
                    ? ` · ${new Date(row.submitted_at).toLocaleString("vi-VN")}`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
