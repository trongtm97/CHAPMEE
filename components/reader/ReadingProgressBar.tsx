"use client";

import { useEffect, useState } from "react";

function getReadableProgress() {
  const readerContent = document.querySelector("[data-reader-content]");
  if (!readerContent) {
    const element = document.documentElement;
    const scrollableHeight = element.scrollHeight - window.innerHeight;
    if (scrollableHeight <= 0) {
      return 0;
    }
    return Math.min(100, Math.max(0, (window.scrollY / scrollableHeight) * 100));
  }

  const rect = readerContent.getBoundingClientRect();
  const total = rect.height;
  if (total <= 0) {
    return 0;
  }

  const viewportBottom = window.scrollY + window.innerHeight;
  const contentTop = window.scrollY + rect.top;
  const read = viewportBottom - contentTop;

  return Math.min(100, Math.max(0, (read / total) * 100));
}

export function ReadingProgressBar() {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    function handleScroll() {
      setPercent(getReadableProgress());
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[120] h-0.5 bg-white/5"
    >
      <div
        className="h-full bg-cyan-300/80 transition-[width] duration-150 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
