"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ActivitySpoilerExcerptProps = {
  excerpt: string | null;
  spoilerLevel: string;
  sourceChapterOrder: number | null;
  readerChapterNumber: number | null;
  targetUrl: string | null;
};

function shouldMaskSpoiler(input: {
  spoilerLevel: string;
  sourceChapterOrder: number | null;
  readerChapterNumber: number | null;
}) {
  if (input.spoilerLevel === "major" || input.spoilerLevel === "mild") {
    return true;
  }

  if (input.sourceChapterOrder === null) {
    return false;
  }

  if (input.readerChapterNumber === null) {
    return input.sourceChapterOrder > 5;
  }

  return input.sourceChapterOrder > input.readerChapterNumber + 1;
}

export function ActivitySpoilerExcerpt({
  excerpt,
  readerChapterNumber,
  sourceChapterOrder,
  spoilerLevel,
  targetUrl
}: ActivitySpoilerExcerptProps) {
  const [revealed, setRevealed] = useState(false);
  const masked = useMemo(
    () =>
      shouldMaskSpoiler({
        spoilerLevel,
        sourceChapterOrder,
        readerChapterNumber
      }),
    [readerChapterNumber, sourceChapterOrder, spoilerLevel]
  );

  if (!excerpt) {
    return null;
  }

  if (!masked || revealed) {
    return <p className="text-sm leading-6 text-zinc-300">{excerpt}</p>;
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
      <p className="select-none text-sm leading-6 text-zinc-400 blur-sm">{excerpt}</p>
      <div className="mt-2 space-y-2">
        <p className="text-xs font-semibold text-amber-200">
          Có thể tiết lộ nội dung
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-full border border-amber-300/30 px-3 py-1.5 text-xs font-bold text-amber-100"
            onClick={() => setRevealed(true)}
            type="button"
          >
            Hiện nội dung
          </button>
          {targetUrl ? (
            <Link
              className="rounded-full bg-cyan-300/15 px-3 py-1.5 text-xs font-bold text-cyan-100"
              href={targetUrl}
            >
              Đi tới chương
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
