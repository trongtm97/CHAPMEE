"use client";

import { useState } from "react";
import { ReportModal } from "@/components/moderation/ReportModal";

type ProfileActionMenuProps = {
  targetUserId: string;
  returnTo: string;
  isOwner: boolean;
};

export function ProfileActionMenu({
  isOwner,
  returnTo,
  targetUserId
}: ProfileActionMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  if (isOwner) {
    return null;
  }

  return (
    <>
      <div className="relative">
        <button
          aria-label="Tùy chọn hồ sơ"
          className="tap-highlight inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/8 bg-white/[0.04] text-lg text-zinc-400"
          onClick={() => setMenuOpen((open) => !open)}
          type="button"
        >
          ⋯
        </button>
        {menuOpen ? (
          <div className="absolute right-0 top-full z-30 mt-1 min-w-[11rem] rounded-xl border border-white/10 bg-[#121820] p-1 shadow-xl">
            <button
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/5"
              onClick={() => {
                setMenuOpen(false);
                setReportOpen(true);
              }}
              type="button"
            >
              Báo cáo người dùng
            </button>
          </div>
        ) : null}
      </div>
      <ReportModal
        defaultOpen={reportOpen}
        hideTrigger
        onClose={() => setReportOpen(false)}
        returnTo={returnTo}
        targetId={targetUserId}
        targetType="user"
        triggerLabel="Báo cáo"
      />
    </>
  );
}
