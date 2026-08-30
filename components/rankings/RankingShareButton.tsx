"use client";

import { useState } from "react";
import { RankingShareModal } from "@/components/rankings/RankingShareModal";
import { Button } from "@/components/ui";
import type { RankingShareContext } from "@/lib/ranking/ranking-share";

type RankingShareButtonProps = {
  context: RankingShareContext;
  variant?: "button" | "icon";
  className?: string;
};

export function RankingShareButton({
  context,
  variant = "button",
  className = ""
}: RankingShareButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "icon" ? (
        <button
          aria-label={`Chia sẻ ${context.item.title}`}
          className={`tap-highlight inline-flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-300 transition hover:border-white/20 hover:text-white ${className}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setOpen(true);
          }}
          type="button"
        >
          <ShareIcon />
        </button>
      ) : (
        <Button
          className={className}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setOpen(true);
          }}
          type="button"
          variant="secondary"
        >
          Chia sẻ
        </Button>
      )}

      <RankingShareModal context={context} onClose={() => setOpen(false)} open={open} />
    </>
  );
}

function ShareIcon() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24">
      <path
        d="M13.5 4.5 18 9l-4.5 4.5V11H8v2h6v2.5L18 15l-4.5-4.5H11V4.5h2.5ZM6 7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-4h-2v4H6V9h4V7H6Z"
        fill="currentColor"
      />
    </svg>
  );
}
