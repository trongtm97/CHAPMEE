"use client";

import { Button } from "@/components/ui";

type ConfirmActionModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  variant?: "danger" | "primary";
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmActionModal({
  open,
  title,
  description,
  confirmLabel,
  pending,
  variant = "danger",
  onConfirm,
  onClose
}: ConfirmActionModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button aria-label="Đóng" className="absolute inset-0 bg-black/65" onClick={onClose} type="button" />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm text-zinc-400">{description}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            loading={pending}
            onClick={onConfirm}
            type="button"
            variant={variant === "danger" ? "danger" : "primary"}
          >
            {confirmLabel}
          </Button>
          <Button disabled={pending} onClick={onClose} type="button" variant="secondary">
            Hủy
          </Button>
        </div>
      </div>
    </div>
  );
}
