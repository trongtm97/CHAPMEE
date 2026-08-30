"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ReelExcerptSheet } from "@/components/reels/ReelExcerptSheet";
import {
  REELS_EXCERPT_TEXT_CLASS,
  REELS_TITLE_TEXT_CLASS,
  ReelExcerptTextMeasurable
} from "@/components/reels/ReelExcerptText";
import { REELS_GUTTER_X_CLASS, reelsContentPadding } from "@/components/reels/reels-layout";
import {
  sanitizeReelsExcerpt,
  sanitizeReelsHookTitle
} from "@/lib/reels/clean-reels-source-text";
import type { ReelsItem } from "@/lib/reels/getReelsItems";

type ReelTextOverlayProps = {
  item: ReelsItem;
  variant?: "mobile" | "desktop";
};

function useExcerptOverflow(excerpt: string, enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    if (!enabled || !excerpt) {
      setOverflows(false);
      return;
    }

    const measure = () => {
      const element = ref.current;
      if (!element) {
        return;
      }
      setOverflows(element.scrollHeight > element.clientHeight + 2);
    };

    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
    };
  }, [enabled, excerpt]);

  return { ref, overflows };
}

export function ReelTextOverlay({ item, variant = "mobile" }: ReelTextOverlayProps) {
  const [excerptExpanded, setExcerptExpanded] = useState(false);
  const genreLabel = item.genreName ?? "Khám phá";
  const title = sanitizeReelsHookTitle(item.hookTitle, item.storyTitle);
  const excerpt = sanitizeReelsExcerpt(item.excerpt?.trim() ?? "");
  const isMobile = variant === "mobile";
  const { ref: excerptRef, overflows: excerptOverflows } = useExcerptOverflow(
    excerpt,
    isMobile
  );

  if (!isMobile) {
    return (
      <>
        <div className="relative z-10 flex h-full min-h-full flex-col justify-start px-6 pb-36 pt-16 pr-10">
          <div className="max-w-[26rem] space-y-5">
            <span className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-cyan-100/95">
              {genreLabel}
            </span>
            <div className="space-y-3">
              <h2
                className={`line-clamp-3 text-[1.75rem] leading-[1.32] ${REELS_TITLE_TEXT_CLASS}`}
              >
                {title}
              </h2>
              {excerpt ? (
                <p className={`line-clamp-[10] ${REELS_EXCERPT_TEXT_CLASS} text-[0.98rem] leading-8`}>
                  {excerpt}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <ReelExcerptSheet
          excerpt={excerpt}
          onClose={() => setExcerptExpanded(false)}
          open={excerptExpanded}
          title={title}
        />
      </>
    );
  }

  return (
    <>
      <div
        className={`absolute inset-0 z-10 flex flex-col ${REELS_GUTTER_X_CLASS}`}
        style={{ paddingBottom: reelsContentPadding.contentBottom }}
      >
        <div aria-hidden className="min-h-0 flex-1" />

        <div className="w-full max-w-none shrink-0 space-y-3">
          <span className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-cyan-100/95">
            {genreLabel}
          </span>

          <div className="space-y-3.5">
            <h2
              className={`line-clamp-3 text-[1.34rem] leading-[1.36] max-[380px]:text-[1.26rem] sm:text-[1.44rem] sm:leading-[1.38] ${REELS_TITLE_TEXT_CLASS}`}
            >
              {title}
            </h2>

            {excerpt ? (
              <div className="relative">
                <ReelExcerptTextMeasurable
                  ref={excerptRef}
                  className="max-h-[min(42dvh,17.5rem)] overflow-hidden max-[380px]:max-h-[min(38dvh,15.5rem)] min-[430px]:max-h-[min(44dvh,18.5rem)]"
                  excerpt={excerpt}
                />
                {excerptOverflows ? (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#06090d]/92 to-transparent"
                  />
                ) : null}
                {excerptOverflows ? (
                  <button
                    className="tap-highlight relative z-10 mt-2.5 text-[0.76rem] font-semibold text-cyan-200/95 hover:text-cyan-100"
                    onClick={() => setExcerptExpanded(true)}
                    type="button"
                  >
                    Xem thêm
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div aria-hidden className="min-h-0 flex-1" />
      </div>

      <ReelExcerptSheet
        excerpt={excerpt}
        onClose={() => setExcerptExpanded(false)}
        open={excerptExpanded}
        title={title}
      />
    </>
  );
}
