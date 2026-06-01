"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

type MonetizationConfirmModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  pending?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function MonetizationConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Xác nhận",
  pending = false,
  destructive = false,
  onConfirm,
  onCancel
}: MonetizationConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button
            aria-label="Đóng"
            className="rounded-lg px-2 py-1 text-zinc-400 hover:bg-white/5 hover:text-white"
            onClick={onCancel}
            type="button"
          >
            ✕
          </button>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-zinc-300">{description}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button disabled={pending} onClick={onCancel} type="button" variant="secondary">
            Hủy
          </Button>
          <Button
            className={
              destructive
                ? "!bg-rose-600 hover:!bg-rose-500"
                : "!bg-cyan-600 hover:!bg-cyan-500"
            }
            disabled={pending}
            onClick={onConfirm}
            type="button"
            variant="primary"
          >
            {pending ? "Đang xử lý…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
