"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

export type ConversationSheetAction = {
  key: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  danger?: boolean;
  onClick: () => void;
};

type ConversationActionSheetProps = {
  open: boolean;
  onClose: () => void;
  actions: ConversationSheetAction[];
  headerSlot?: ReactNode;
};

export function ConversationActionSheet({
  open,
  onClose,
  actions,
  headerSlot
}: ConversationActionSheetProps) {
  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[200]">
      <button
        aria-label="Đóng"
        className="absolute inset-0 bg-black/55"
        onClick={onClose}
        type="button"
      />
      <div
        aria-labelledby="conversation-action-sheet-title"
        aria-modal="true"
        className="absolute inset-x-0 bottom-0 z-10 mx-auto w-full max-w-lg rounded-t-[1.25rem] border border-white/10 border-b-0 bg-[#0b1016] shadow-[0_-16px_48px_rgba(0,0,0,0.45)]"
        role="dialog"
      >
        <div className="flex justify-center pt-2.5">
          <span className="h-1 w-10 rounded-full bg-white/15" aria-hidden />
        </div>
        <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-1">
          <h2
            className="text-base font-semibold text-zinc-50"
            id="conversation-action-sheet-title"
          >
            Tuỳ chọn cuộc trò chuyện
          </h2>
          <button
            className="min-h-9 rounded-full px-3 text-sm font-medium text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
            onClick={onClose}
            type="button"
          >
            Đóng
          </button>
        </div>
        <div className="max-h-[70dvh] overflow-y-auto overscroll-contain px-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          {headerSlot}
          {headerSlot ? <div className="my-1 border-t border-white/[0.06]" /> : null}
          {actions.map((action) => (
            <button
              aria-label={`${action.title}. ${action.subtitle}`}
              className="tap-highlight flex min-h-[3.75rem] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.04] active:bg-white/[0.06]"
              key={action.key}
              onClick={() => {
                onClose();
                action.onClick();
              }}
              type="button"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  action.danger
                    ? "bg-red-400/10 text-red-300/90"
                    : "bg-white/[0.06] text-cyan-100/90"
                }`}
              >
                {action.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-[0.9375rem] font-semibold leading-snug ${
                    action.danger ? "text-red-200/90" : "text-zinc-100"
                  }`}
                >
                  {action.title}
                </span>
                <span
                  className={`mt-0.5 block line-clamp-2 text-xs leading-5 ${
                    action.danger ? "text-red-200/55" : "text-zinc-500"
                  }`}
                >
                  {action.subtitle}
                </span>
              </span>
              <ChevronIcon />
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function ConversationProfileSheetRow({
  href,
  onClose,
  title,
  subtitle,
  icon
}: {
  href: string;
  onClose: () => void;
  title: string;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <Link
      className="tap-highlight flex min-h-[3.75rem] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.04]"
      href={href}
      onClick={onClose}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-cyan-100/90">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] font-semibold leading-snug text-zinc-100">
          {title}
        </span>
        <span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-zinc-500">
          {subtitle}
        </span>
      </span>
      <ChevronIcon />
    </Link>
  );
}

function ChevronIcon() {
  return (
    <svg aria-hidden className="size-5 shrink-0 text-zinc-600" fill="none" viewBox="0 0 24 24">
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
