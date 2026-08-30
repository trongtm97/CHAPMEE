"use client";

import { useTransition } from "react";
import {
  disableAllSnippetsAction,
  enableAllSnippetsAction
} from "@/lib/admin/snippet-actions";

type SnippetSafeModeBannerProps = {
  snippetsEnabled: boolean;
  envDisabled: boolean;
  canManage: boolean;
};

export function SnippetSafeModeBanner({
  snippetsEnabled,
  envDisabled,
  canManage
}: SnippetSafeModeBannerProps) {
  const [pending, startTransition] = useTransition();

  if (envDisabled) {
    return (
      <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        Safe mode: biến môi trường <code className="text-amber-200">CHAPMEE_DISABLE_SNIPPETS=true</code>{" "}
        đang tắt toàn bộ snippet trên frontend. Admin vẫn có thể chỉnh snippet.
      </div>
    );
  }

  if (snippetsEnabled) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-zinc-400">
        <span>Snippet rendering đang bật trên site công khai.</span>
        {canManage ? (
          <button
            className="rounded-full border border-rose-400/40 px-3 py-1.5 font-semibold text-rose-200 hover:bg-rose-500/10 disabled:opacity-50"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await disableAllSnippetsAction();
              })
            }
            type="button"
          >
            Tắt toàn bộ snippet
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
      <span>
        <strong>Safe mode:</strong> mọi snippet đã ngừng render trên frontend. Bạn vẫn có thể sửa
        snippet tại đây.
      </span>
      {canManage ? (
        <button
          className="rounded-full border border-cyan-300/40 px-3 py-1.5 font-semibold text-cyan-100 hover:bg-cyan-500/10 disabled:opacity-50"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await enableAllSnippetsAction();
            })
          }
          type="button"
        >
          Bật lại snippet
        </button>
      ) : null}
    </div>
  );
}
