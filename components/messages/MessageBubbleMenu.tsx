"use client";

import { useState } from "react";
import { ReportMessageDialog } from "@/components/messages/ReportMessageDialog";

type MessageBubbleMenuProps = {
  conversationId: string;
  messageId: string;
  reportedUserId: string;
};

export function MessageBubbleMenu({
  conversationId,
  messageId,
  reportedUserId
}: MessageBubbleMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <div className="relative ml-1 shrink-0 self-end">
        <button
          aria-label="Tuỳ chọn tin nhắn"
          className="inline-flex min-h-7 min-w-7 items-center justify-center rounded-full text-zinc-600 hover:bg-white/5 hover:text-zinc-400"
          onClick={() => setMenuOpen((v) => !v)}
          type="button"
        >
          ⋮
        </button>
        {menuOpen ? (
          <div className="absolute bottom-full right-0 z-10 mb-1 min-w-[10rem] rounded-xl border border-white/10 bg-[#121820] py-1 shadow-xl">
            <button
              className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/5"
              onClick={() => {
                setMenuOpen(false);
                setOpen(true);
              }}
              type="button"
            >
              Báo cáo tin nhắn
            </button>
          </div>
        ) : null}
      </div>
      {open ? (
        <ReportMessageDialog
          conversationId={conversationId}
          messageId={messageId}
          onClose={() => setOpen(false)}
          reportedUserId={reportedUserId}
          variant="message"
        />
      ) : null}
    </>
  );
}
