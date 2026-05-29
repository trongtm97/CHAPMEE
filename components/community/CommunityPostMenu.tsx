"use client";

import { useEffect, useRef, useState } from "react";
import { ReportModal } from "@/components/moderation/ReportModal";

type CommunityPostMenuProps = {
  postId: string;
  returnTo?: string;
  onHide?: () => void;
  onMarkSpoiler?: () => void;
};

export function CommunityPostMenu({
  onHide,
  onMarkSpoiler,
  postId,
  returnTo = "/community"
}: CommunityPostMenuProps) {
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function runAction(label: string, action?: () => void) {
    action?.();
    setMessage(`${label} — đã ghi nhận (MVP)`);
    setOpen(false);
    window.setTimeout(() => setMessage(null), 2200);
  }

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Tùy chọn bài viết"
        className="flex size-9 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span aria-hidden="true" className="text-lg leading-none">
          ⋯
        </span>
      </button>

      {open ? (
        <div
          className="absolute right-0 top-10 z-20 min-w-[11rem] rounded-2xl border border-white/10 bg-[#121820] p-1.5 shadow-xl"
          role="menu"
        >
          <MenuItem
            label="Báo cáo bài"
            onClick={() => {
              setOpen(false);
              setReportOpen(true);
            }}
          />
          <MenuItem
            label="Ẩn bài"
            onClick={() => runAction("Ẩn bài", onHide)}
          />
          <MenuItem
            label="Đánh dấu spoiler"
            onClick={() => runAction("Spoiler", onMarkSpoiler)}
          />
        </div>
      ) : null}

      {reportOpen ? (
        <ReportModal
          defaultOpen
          hideTrigger
          onClose={() => setReportOpen(false)}
          returnTo={returnTo}
          targetId={postId}
          targetType="community_post"
        />
      ) : null}

      {message ? (
        <p className="absolute right-0 top-11 z-10 max-w-[12rem] rounded-xl bg-zinc-900 px-2 py-1 text-[0.68rem] text-zinc-300">
          {message}
        </p>
      ) : null}

      <span className="sr-only">Post {postId}</span>
    </div>
  );
}

function MenuItem({
  label,
  onClick
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex w-full rounded-xl px-3 py-2.5 text-left text-sm text-zinc-200 transition hover:bg-white/5"
      onClick={onClick}
      role="menuitem"
      type="button"
    >
      {label}
    </button>
  );
}
