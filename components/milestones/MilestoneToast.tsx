"use client";

import Link from "next/link";
import { useMilestoneToast } from "@/hooks/useMilestones";

export function MilestoneToast() {
  const { dismiss, notice } = useMilestoneToast();

  if (!notice.open || !notice.title || !notice.description) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-[calc(6.4rem+env(safe-area-inset-bottom))] z-50 px-4">
      <div className="mx-auto w-full max-w-[38rem] rounded-[1.5rem] border border-cyan-300/20 bg-[#08131d]/95 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-300 text-sm font-black text-zinc-950">
            ✓
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
              Cột mốc mới
            </p>
            <h2 className="mt-1 text-base font-black text-white">{notice.title}</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-300">{notice.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                className="inline-flex min-h-10 items-center justify-center rounded-full bg-cyan-300 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-950 transition hover:bg-cyan-200"
                href={notice.href ?? "/me#milestones"}
              >
                Xem thành tích
              </Link>
              <button
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-100 transition hover:bg-white/[0.08]"
                onClick={dismiss}
                type="button"
              >
                Đóng
              </button>
              <button
                className="inline-flex min-h-10 cursor-not-allowed items-center justify-center rounded-full border border-dashed border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-500"
                disabled
                type="button"
              >
                Chia sẻ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

