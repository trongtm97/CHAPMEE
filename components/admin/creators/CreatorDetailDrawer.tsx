"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export function CreatorDetailDrawer({ open, onClose, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label="Đóng"
        className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
        onClick={onClose}
        type="button"
      />
      <div className="relative flex h-full w-full max-w-[680px] flex-col border-l border-white/10 bg-[#0b1016] shadow-2xl transition-transform">
        {children}
      </div>
    </div>
  );
}
