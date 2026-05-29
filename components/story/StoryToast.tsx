"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { parseStoryToastParam, storyToastMessage } from "@/lib/stories/story-toast";

export function StoryToast() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const key = parseStoryToastParam(searchParams.get("storyToast"));
    if (!key) {
      return;
    }

    setMessage(storyToastMessage(key));
    const params = new URLSearchParams(searchParams.toString());
    params.delete("storyToast");
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });

    const timer = window.setTimeout(() => setMessage(null), 2800);
    return () => window.clearTimeout(timer);
  }, [router, searchParams]);

  if (!message) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[180] flex justify-center px-4">
      <p className="rounded-full border border-cyan-300/25 bg-[#0f161f]/95 px-4 py-2.5 text-sm font-semibold text-cyan-50 shadow-lg backdrop-blur-md">
        {message}
      </p>
    </div>
  );
}
