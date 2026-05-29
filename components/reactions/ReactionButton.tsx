"use client";

import { Button } from "@/components/ui";
import type { ChapterReactionKey } from "@/types/reaction";

type ReactionButtonProps = {
  label: string;
  emoji: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  reactionKey: ChapterReactionKey;
};

export function ReactionButton({ label, emoji, selected, disabled, onClick }: ReactionButtonProps) {
  return (
    <Button
      className={`min-h-11 rounded-full px-3.5 py-2 text-sm font-bold normal-case tracking-normal ${selected ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100" : "border-white/10 bg-white/[0.04] text-zinc-200"}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
      variant="secondary"
    >
      <span className="mr-2">{emoji}</span>
      {label}
    </Button>
  );
}
