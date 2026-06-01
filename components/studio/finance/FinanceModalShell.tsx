"use client";

import type { ReactNode } from "react";

type FinanceModalShellProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function FinanceModalShell({ title, open, onClose, children }: FinanceModalShellProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/10 bg-zinc-950 p-4 shadow-xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-zinc-100">{title}</h3>
          <button
            className="rounded-lg border border-white/10 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200"
            onClick={onClose}
            type="button"
          >
            Đóng
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
