"use client";

import { useEffect, useState, useTransition } from "react";
import { CreatorFeePolicyEditor } from "@/components/admin/creator-fee-policies/CreatorFeePolicyEditor";
import { CreatorFeePolicyPreview } from "@/components/admin/creator-fee-policies/CreatorFeePolicyPreview";
import { Button } from "@/components/ui";
import { loadCreatorFeePolicyDetailAction } from "@/lib/admin/creator-fee-policies/get-policy-detail";
import { CREATOR_FEE_STATUS_LABELS } from "@/lib/admin/creator-fee-policies/constants";
import type {
  CreatorFeePolicyAdminCapabilities,
  CreatorFeePolicyDetail
} from "@/types/admin-creator-fee-policy";

type Props = {
  open: boolean;
  policyId: string | null;
  capabilities: CreatorFeePolicyAdminCapabilities;
  editMode?: boolean;
  onClose: () => void;
  onRefresh: () => void;
  initialTab?: "summary" | "editor" | "history";
};

export function CreatorFeePolicyDetailDrawer({
  open,
  policyId,
  capabilities,
  editMode = false,
  onClose,
  onRefresh,
  initialTab = "summary"
}: Props) {
  const [detail, setDetail] = useState<CreatorFeePolicyDetail | null>(null);
  const [tab, setTab] = useState<"summary" | "editor" | "history">(initialTab);
  const [editing, setEditing] = useState(editMode);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !policyId) return;
    setTab(initialTab);
    setEditing(editMode);
    startTransition(async () => {
      setError(null);
      const result = await loadCreatorFeePolicyDetailAction(policyId);
      if (result.error) {
        setError(result.error);
        setDetail(null);
        return;
      }
      setDetail(result.detail);
    });
  }, [open, policyId, initialTab, editMode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const policyRow = detail?.policy;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60">
      <div className="flex h-full w-full max-w-2xl flex-col border-l border-white/10 bg-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <h2 className="text-lg font-bold text-white">Chi tiết chính sách phí</h2>
            {policyRow ? (
              <p className="text-sm text-zinc-400">{policyRow.policyName}</p>
            ) : null}
          </div>
          <Button onClick={onClose} type="button" variant="secondary">
            Đóng
          </Button>
        </div>

        <div className="flex gap-1 border-b border-white/10 px-4">
          {(["summary", "editor", "history"] as const).map((t) => (
            <button
              className={`px-3 py-2 text-sm ${
                tab === t ? "border-b-2 border-cyan-400 text-cyan-300" : "text-zinc-400"
              }`}
              key={t}
              onClick={() => {
                setTab(t);
                if (t === "editor") setEditing(true);
              }}
              type="button"
            >
              {t === "summary" ? "Tổng quan" : t === "editor" ? "Chỉnh sửa" : "Lịch sử"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {pending && !detail ? (
            <p className="text-sm text-zinc-400">Đang tải…</p>
          ) : error ? (
            <p className="text-sm text-rose-300">{error}</p>
          ) : detail ? (
            <>
              {tab === "summary" ? (
                <div className="space-y-4">
                  <section className="rounded-xl border border-white/10 p-4">
                    <h3 className="font-semibold text-white">Tác giả</h3>
                    <p className="mt-1 text-white">{detail.creator.displayName}</p>
                    <p className="text-sm text-zinc-400">@{detail.creator.username ?? "—"}</p>
                    {detail.creator.studioName ? (
                      <p className="text-sm text-zinc-400">Studio: {detail.creator.studioName}</p>
                    ) : null}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                      <span>Truyện: {detail.creator.storyCount}</span>
                      <span>Chương: {detail.creator.chapterCount}</span>
                      <span>
                        Doanh thu 30 ngày:{" "}
                        {detail.creator.revenue30dVnd.toLocaleString("vi-VN")} ₫
                      </span>
                      <span>Rút tiền: {detail.creator.withdrawalCount} lần</span>
                    </div>
                    {detail.creator.riskWarnings.length > 0 ? (
                      <ul className="mt-2 text-xs text-amber-300">
                        {detail.creator.riskWarnings.map((w) => (
                          <li key={w}>⚠ {w}</li>
                        ))}
                      </ul>
                    ) : null}
                  </section>

                  <section className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                    <h3 className="font-semibold text-cyan-100">Policy hiện tại</h3>
                    <p className="mt-1 text-sm text-zinc-300">
                      Trạng thái: {CREATOR_FEE_STATUS_LABELS[detail.policy.status]}
                    </p>
                    <p className="text-sm text-zinc-300">
                      {new Date(detail.policy.startsAt).toLocaleString("vi-VN")}
                      {detail.policy.endsAt
                        ? ` → ${new Date(detail.policy.endsAt).toLocaleString("vi-VN")}`
                        : " → không giới hạn"}
                    </p>
                    {detail.policy.note ? (
                      <p className="mt-2 text-sm text-zinc-400">Ghi chú: {detail.policy.note}</p>
                    ) : null}
                  </section>

                  <CreatorFeePolicyPreview
                    creatorId={detail.creator.userId}
                    policyId={detail.policy.id}
                    sourceRates={detail.policy.sourceRates}
                  />
                </div>
              ) : null}

              {tab === "editor" && capabilities.canUpdate ? (
                <CreatorFeePolicyEditor
                  creatorId={detail.creator.userId}
                  defaultRates={detail.defaultRates}
                  editing={detail.policyRow}
                  onCancel={() => setEditing(false)}
                  onSuccess={() => {
                    onRefresh();
                    onClose();
                  }}
                />
              ) : tab === "editor" ? (
                <p className="text-sm text-zinc-400">Bạn không có quyền sửa chính sách phí.</p>
              ) : null}

              {tab === "history" ? (
                <div className="space-y-2">
                  {detail.auditHistory.length === 0 ? (
                    <p className="text-sm text-zinc-400">Chưa có lịch sử thay đổi.</p>
                  ) : (
                    detail.auditHistory.map((entry) => (
                      <div className="rounded-lg border border-white/10 p-3 text-sm" key={entry.id}>
                        <p className="font-medium text-white">{entry.action}</p>
                        <p className="text-xs text-zinc-500">
                          {entry.actorLabel ?? "—"} ·{" "}
                          {new Date(entry.createdAt).toLocaleString("vi-VN")}
                        </p>
                        {entry.reason ? (
                          <p className="mt-1 text-zinc-400">Lý do: {entry.reason}</p>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
