"use client";

import { useState } from "react";
import { copyToClipboard, COPY_FEEDBACK_MS } from "@/lib/utilities/copy-to-clipboard";

type PublicCodeCopyProps = {
  code: string;
  label: string;
};

export function PublicCodeCopy({ code, label }: PublicCodeCopyProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyToClipboard(code);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
      <div className="min-w-0">
        <span className="text-zinc-500">{label}</span>
        <p className="truncate font-mono text-xs font-semibold text-cyan-200 sm:text-sm">{code}</p>
      </div>
      <button
        className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-100 transition hover:bg-white/10"
        onClick={() => void handleCopy()}
        type="button"
      >
        {copied ? "Đã sao chép" : "Sao chép"}
      </button>
    </div>
  );
}
