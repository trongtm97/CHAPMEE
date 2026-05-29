"use client";

import { Button } from "@/components/ui";

type MonetizationStickyBarProps = {
  visible: boolean;
  pending: boolean;
  canSave: boolean;
  onSave: () => void;
  onRestore: () => void;
};

export function MonetizationStickyBar({
  visible,
  pending,
  canSave,
  onSave,
  onRestore
}: MonetizationStickyBarProps) {
  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-cyan-400/20 bg-zinc-950/95 px-4 py-3 backdrop-blur md:bottom-auto md:top-[4.5rem] md:border-b md:border-t-0">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-cyan-200">Có thay đổi chưa lưu</p>
        <div className="flex flex-wrap gap-2">
          <Button disabled={pending} onClick={onRestore} type="button" variant="secondary">
            Khôi phục
          </Button>
          <Button
            disabled={pending || !canSave}
            onClick={onSave}
            type="button"
            variant="primary"
          >
            {pending ? "Đang lưu…" : "Lưu thay đổi"}
          </Button>
        </div>
      </div>
    </div>
  );
}
