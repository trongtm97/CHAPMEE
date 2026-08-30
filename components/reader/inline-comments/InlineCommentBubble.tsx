"use client";

type InlineCommentBubbleProps = {
  blockId: string;
  commentCount: number;
  onOpen: () => void;
  onCompose?: () => void;
};

export function InlineCommentBubble({
  blockId,
  commentCount,
  onCompose,
  onOpen
}: InlineCommentBubbleProps) {
  if (commentCount > 0) {
    return (
      <button
        aria-label={`${commentCount} bình luận đoạn`}
        className="absolute -right-1 top-0 z-10 flex h-6 min-w-6 translate-x-full items-center justify-center gap-0.5 rounded-full bg-cyan-400/95 px-1.5 text-[10px] font-bold text-zinc-950 shadow-md transition hover:bg-cyan-300 md:-right-2"
        data-inline-bubble={blockId}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onOpen();
        }}
        type="button"
      >
        <span aria-hidden>💬</span>
        {commentCount}
      </button>
    );
  }

  return (
    <button
      aria-label="Bình luận đoạn này"
      className="absolute -right-1 top-0 z-10 flex h-6 w-6 translate-x-full items-center justify-center rounded-full border border-white/15 bg-black/40 text-xs font-bold text-zinc-300 opacity-0 shadow transition group-hover:opacity-100 hover:border-cyan-400/40 hover:text-cyan-200 md:-right-2"
      data-inline-bubble-compose={blockId}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onCompose?.();
      }}
      type="button"
    >
      +
    </button>
  );
}
