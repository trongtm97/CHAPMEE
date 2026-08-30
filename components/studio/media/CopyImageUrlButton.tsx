"use client";

import { useState } from "react";

type CopyImageUrlButtonProps = {
  imageId: string;
  url: string;
};

export function CopyImageUrlButton({ imageId, url }: CopyImageUrlButtonProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(imageId);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(null);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copyUrl()}
      className="w-full rounded-lg border border-white/10 px-2 py-1.5 text-[11px] font-semibold text-cyan-200 hover:bg-white/5"
    >
      {copiedId === imageId ? "Đã sao chép URL" : "Sao chép URL"}
    </button>
  );
}
