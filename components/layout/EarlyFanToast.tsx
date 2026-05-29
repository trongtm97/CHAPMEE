"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export function EarlyFanToast() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dismissedStoryId, setDismissedStoryId] = useState<string | null>(null);

  const fanEarly = searchParams.get("fanEarly");
  const fanStoryId = searchParams.get("fanStoryId");
  const fanStoryTitle = searchParams.get("fanStoryTitle");

  const open = useMemo(
    () =>
      fanEarly === "1" &&
      Boolean(fanStoryId) &&
      Boolean(fanStoryTitle) &&
      dismissedStoryId !== fanStoryId,
    [dismissedStoryId, fanEarly, fanStoryId, fanStoryTitle]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeout = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("fanEarly");
      next.delete("fanStoryId");
      next.delete("fanStorySlug");
      next.delete("fanStoryTitle");

      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      setDismissedStoryId(fanStoryId);
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [fanStoryId, open, pathname, router, searchParams]);

  if (!open || !fanStoryTitle) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-[calc(6.4rem+env(safe-area-inset-bottom))] z-50 px-4">
      <div className="mx-auto w-full max-w-[38rem] rounded-[1.5rem] border border-cyan-300/20 bg-[#08131d]/95 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-300 text-sm font-black text-zinc-950">
            E
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
              Fan đời đầu
            </p>
            <h2 className="mt-1 text-base font-black text-white">
              Bạn vừa trở thành Fan đời đầu của {fanStoryTitle}
            </h2>
            <p className="mt-1 text-sm leading-6 text-zinc-300">
              Huy hiệu này sẽ ở lại hồ sơ của bạn như một dấu mốc đọc truyện từ
              sớm.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                className="inline-flex min-h-10 items-center justify-center rounded-full bg-cyan-300 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-950 transition hover:bg-cyan-200"
                href="/me#fan-doi-dau"
              >
                Xem thành tích
              </Link>
              <button
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-100 transition hover:bg-white/[0.08]"
                onClick={() => {
                  const next = new URLSearchParams(searchParams.toString());
                  next.delete("fanEarly");
                  next.delete("fanStoryId");
                  next.delete("fanStorySlug");
                  next.delete("fanStoryTitle");
                  const query = next.toString();
                  router.replace(query ? `${pathname}?${query}` : pathname, {
                    scroll: false
                  });
                  setDismissedStoryId(fanStoryId);
                }}
                type="button"
              >
                Chia sẻ sau
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
