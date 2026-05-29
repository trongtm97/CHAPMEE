"use client";

import { Button } from "@/components/ui";

type PublishConfirmDialogProps = {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
};

export function PublishConfirmDialog({
  onCancel,
  onConfirm,
  open,
  pending = false
}: PublishConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-xl">
        <h2 className="text-lg font-bold text-white">Xác nhận đăng</h2>
        <p className="mt-2 text-sm text-zinc-300">
          Vẫn đăng dù còn mục nên cải thiện?
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Bạn có thể quay lại chỉnh sau khi đăng.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button disabled={pending} onClick={onCancel} type="button" variant="secondary">
            Quay lại
          </Button>
          <Button disabled={pending} onClick={onConfirm} type="button">
            Vẫn đăng
          </Button>
        </div>
      </div>
    </div>
  );
}
