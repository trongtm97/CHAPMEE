import { forwardRef, type ReactNode } from "react";

/** Shared story excerpt typography for Reels. */
export const REELS_EXCERPT_TEXT_CLASS =
  "text-left text-pretty text-[0.9rem] leading-[1.9rem] tracking-[0.01em] text-zinc-100/90 sm:text-[0.92rem] sm:leading-[1.95rem]";

export const REELS_TITLE_TEXT_CLASS =
  "text-left text-pretty font-black tracking-[-0.02em] text-white";

function splitExcerptParagraphs(excerpt: string) {
  const parts = excerpt
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length > 0 ? parts : [excerpt];
}

type ReelExcerptTextProps = {
  excerpt: string;
  className?: string;
};

export const ReelExcerptText = forwardRef<HTMLDivElement, ReelExcerptTextProps>(
  function ReelExcerptText({ excerpt, className = "" }, ref) {
    const paragraphs = splitExcerptParagraphs(excerpt);

    if (paragraphs.length === 1) {
      return (
        <p ref={ref as React.Ref<HTMLParagraphElement>} className={`${REELS_EXCERPT_TEXT_CLASS} whitespace-pre-wrap ${className}`.trim()}>
          {paragraphs[0]}
        </p>
      );
    }

    return (
      <div ref={ref} className={`space-y-5 ${className}`.trim()}>
        {paragraphs.map((paragraph, index) => (
          <p className={`${REELS_EXCERPT_TEXT_CLASS} whitespace-pre-wrap`} key={index}>
            {paragraph}
          </p>
        ))}
      </div>
    );
  }
);

type ReelExcerptTextWithOverflowProps = ReelExcerptTextProps & {
  children?: ReactNode;
};

/** Wrapper that always uses a div ref for overflow measurement. */
export const ReelExcerptTextMeasurable = forwardRef<
  HTMLDivElement,
  ReelExcerptTextWithOverflowProps
>(function ReelExcerptTextMeasurable({ excerpt, className = "" }, ref) {
  const paragraphs = splitExcerptParagraphs(excerpt);

  if (paragraphs.length === 1) {
    return (
      <div ref={ref} className={className}>
        <p className={`${REELS_EXCERPT_TEXT_CLASS} whitespace-pre-wrap`}>{paragraphs[0]}</p>
      </div>
    );
  }

  return (
    <div ref={ref} className={`space-y-5 ${className}`.trim()}>
      {paragraphs.map((paragraph, index) => (
        <p className={`${REELS_EXCERPT_TEXT_CLASS} whitespace-pre-wrap`} key={index}>
          {paragraph}
        </p>
      ))}
    </div>
  );
});
