"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { QualityHistoryTimeline } from "@/components/studio/QualityHistoryTimeline";
import {
  adminApproveAppealAction,
  adminConfirmLowQualityAction,
  adminDisableMonetizationAction,
  adminHideTemporarilyAction,
  adminPermanentHideAction,
  adminRejectAppealAction,
  adminRestoreQualityAction
} from "@/lib/admin/admin-quality-actions";
import { qualityReasonLabel, qualityStatusLabel } from "@/lib/content-quality/labels";

type AdminContentQualityDetailProps = {
  storyId: string;
  payload: NonNullable<
    Awaited<ReturnType<typeof import("@/lib/admin/get-content-quality-admin-detail").getContentQualityAdminDetail>>["data"]
  >;
};

export function AdminContentQualityDetail({ storyId, payload }: AdminContentQualityDetailProps) {
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Thất bại.");
        return;
      }
      setMessage("Đã cập nhật.");
    });
  }

  const { story, author, detail, signals, appeal, reports, monetizationTransactions } =
    payload;

  return (
    <div className="space-y-6">
      <Link className="text-sm text-cyan-300" href="/admin/content-quality">
        ← Hàng đợi chất lượng
      </Link>

      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-white">{story.title}</h1>
        <p className="text-sm text-zinc-400">
          {author.displayName} · {qualityStatusLabel(story.qualityStatus as never)} · Lần{" "}
          {story.attemptCount}
        </p>
        {story.description ? (
          <p className="text-sm text-zinc-300 line-clamp-4">{story.description}</p>
        ) : null}
      </header>

      <section className="rounded-xl border border-white/10 p-4">
        <h2 className="font-bold text-white">Tín hiệu</h2>
        <pre className="mt-2 overflow-x-auto text-xs text-zinc-400">
          {JSON.stringify(signals.snapshot, null, 2)}
        </pre>
        {signals.suggestedReasons.length > 0 ? (
          <p className="mt-2 text-sm text-amber-200">
            Gợi ý: {signals.suggestedReasons.map(qualityReasonLabel).join(", ")}
          </p>
        ) : null}
      </section>

      {detail ? (
        <section className="rounded-xl border border-white/10 p-4">
          <h2 className="font-bold text-white">Lịch sử</h2>
          <QualityHistoryTimeline history={detail.history} />
        </section>
      ) : null}

      {appeal ? (
        <section className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
          <h2 className="font-bold text-amber-100">Khiếu nại</h2>
          <p className="mt-2 text-sm text-amber-100/90">{appeal.message as string}</p>
          <p className="mt-1 text-xs text-amber-200/70">Trạng thái: {String(appeal.status)}</p>
        </section>
      ) : null}

      {reports.length > 0 ? (
        <section className="rounded-xl border border-white/10 p-4">
          <h2 className="font-bold text-white">Báo cáo liên quan</h2>
          <ul className="mt-2 space-y-1 text-sm text-zinc-400">
            {reports.map((r) => (
              <li key={r.id as string}>
                {String(r.reason)} — {String(r.status)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {monetizationTransactions.length > 0 ? (
        <section className="rounded-xl border border-white/10 p-4">
          <h2 className="font-bold text-white">Doanh thu gần đây (truyện)</h2>
          <ul className="mt-2 space-y-1 text-sm text-zinc-400">
            {monetizationTransactions.map((tx) => (
              <li key={tx.id as string}>
                {String(tx.type)} · {Number(tx.creator_net_vnd ?? 0).toLocaleString("vi-VN")} ₫
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-xl border border-white/10 p-4 space-y-3">
        <h2 className="font-bold text-white">Hành động admin</h2>
        <textarea
          className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ghi chú admin (bắt buộc với ẩn vĩnh viễn / tắt kiếm tiền / từ chối khiếu nại)"
          rows={3}
          value={note}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={pending}
            onClick={() =>
              run(() => adminConfirmLowQualityAction({ storyId, moderatorNote: note }))
            }
            type="button"
          >
            Xác nhận vẫn thấp
          </Button>
          <Button
            disabled={pending}
            onClick={() => run(() => adminRestoreQualityAction({ storyId, moderatorNote: note }))}
            type="button"
            variant="secondary"
          >
            Khôi phục
          </Button>
          <Button
            disabled={pending}
            onClick={() => run(() => adminHideTemporarilyAction({ storyId, moderatorNote: note }))}
            type="button"
            variant="secondary"
          >
            Ẩn tạm
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              run(() => adminPermanentHideAction({ storyId, moderatorNote: note }))
            }
            type="button"
            variant="secondary"
          >
            Ẩn vĩnh viễn
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              run(() => adminDisableMonetizationAction({ storyId, moderatorNote: note }))
            }
            type="button"
            variant="secondary"
          >
            Tắt kiếm tiền
          </Button>
          {appeal?.status === "pending" ? (
            <>
              <Button
                disabled={pending}
                onClick={() =>
                  run(() => adminApproveAppealAction({ storyId, moderatorNote: note }))
                }
                type="button"
              >
                Chấp khiếu nại
              </Button>
              <Button
                disabled={pending}
                onClick={() =>
                  run(() => adminRejectAppealAction({ storyId, moderatorNote: note }))
                }
                type="button"
                variant="secondary"
              >
                Từ chối khiếu nại
              </Button>
            </>
          ) : null}
        </div>
        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </section>
    </div>
  );
}
