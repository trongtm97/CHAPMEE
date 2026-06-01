"use client";

import { useEffect, useId, useRef } from "react";
import {
  storiesBtnDanger,
  storiesBtnGhost,
  storiesBtnSecondary
} from "@/components/studio/stories/shared/styles";

type StudioStoriesConfirmModalProps = {
  confirmLabel?: string;
  confirmText?: string;
  confirmValueRequired?: string;
  description: string;
  destructive?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onConfirmTextChange?: (value: string) => void;
  open: boolean;
  title: string;
};

export function StudioStoriesConfirmModal({
  confirmLabel = "Xác nhận",
  confirmText = "",
  confirmValueRequired,
  description,
  destructive = false,
  onClose,
  onConfirm,
  onConfirmTextChange,
  open,
  title
}: StudioStoriesConfirmModalProps) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    inputRef.current?.focus();
  }, [open]);

  if (!open) {
    return null;
  }

  const needsTypedConfirm = Boolean(confirmValueRequired);
  const typedOk =
    !needsTypedConfirm ||
    confirmText.trim().toUpperCase() === confirmValueRequired?.toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <button
        aria-label="Đóng"
        className="absolute inset-0"
        onClick={onClose}
        type="button"
      />
      <div
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-4 shadow-2xl sm:p-5"
        role="dialog"
      >
        <h2 className="text-base font-bold text-white" id={titleId}>
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">{description}</p>

        {needsTypedConfirm ? (
          <label className="mt-4 block space-y-1.5 text-sm">
            <span className="font-semibold text-zinc-200">
              Nhập{" "}
              <span className="font-mono text-amber-200">{confirmValueRequired}</span>{" "}
              để xác nhận
            </span>
            <input
              className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-sm text-zinc-100"
              onChange={(event) => onConfirmTextChange?.(event.target.value)}
              placeholder={confirmValueRequired}
              ref={inputRef}
              type="text"
              value={confirmText}
            />
          </label>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button className={storiesBtnGhost} onClick={onClose} type="button">
            Huỷ
          </button>
          <button
            className={destructive ? storiesBtnDanger : storiesBtnSecondary}
            disabled={!typedOk}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
