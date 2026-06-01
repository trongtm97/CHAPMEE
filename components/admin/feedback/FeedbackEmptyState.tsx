"use client";

import { Button } from "@/components/ui";

type Props = {
  onReset: () => void;
};

export function FeedbackEmptyState({ onReset }: Props) {
  return (
    <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center">
      <p className="text-lg font-semibold text-white">Không có feedback phù hợp bộ lọc.</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
        Hãy thử đổi bộ lọc hoặc reset bộ lọc.
      </p>
      <Button className="mt-6" onClick={onReset} type="button" variant="secondary">
        Reset bộ lọc
      </Button>
    </div>
  );
}
