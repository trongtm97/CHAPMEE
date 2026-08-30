"use client";

import Link from "next/link";
import { useState } from "react";

const primaryButtonClass =
  "inline-flex w-full items-center justify-center rounded-xl border border-rose-400/40 bg-rose-500/15 px-4 py-2.5 text-sm font-semibold text-rose-100 transition hover:border-rose-300/50 hover:bg-rose-500/25 disabled:opacity-50";

const secondaryButtonClass =
  "inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-zinc-900/80 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-white/20";

type SharePanelProps = {
  shareUrl: string;
  ogImageUrl: string;
  displayPair: string;
  totalScore: number;
  levelLabel: string;
  onCopied: () => void;
  copied: boolean;
};

export function SharePanel({
  shareUrl,
  ogImageUrl,
  displayPair,
  totalScore,
  levelLabel,
  onCopied,
  copied
}: SharePanelProps) {
  const shareText = `${displayPair} — ${totalScore}/100 (${levelLabel}) — Bói tình yêu ChapMee`;
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const zaloUrl = `https://sp.zalo.me/share_inline?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`;

  return (
    <section
      aria-labelledby="love-share-panel"
      className="rounded-2xl border border-rose-400/25 bg-gradient-to-br from-rose-500/10 via-zinc-900/50 to-violet-500/5 p-4 sm:p-5"
    >
      <h2 className="text-base font-bold text-zinc-50" id="love-share-panel">
        Chia sẻ kết quả
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
        Gửi link cho người ấy hoặc bạn bè — tên hiển thị theo chế độ riêng tư bạn đã chọn.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button className={primaryButtonClass} onClick={onCopied} type="button">
          {copied ? "✓ Đã copy link" : "🔗 Copy link"}
        </button>
        <a className={secondaryButtonClass} href={fbUrl} rel="noopener noreferrer" target="_blank">
          📘 Chia sẻ Facebook
        </a>
        <a className={secondaryButtonClass} href={zaloUrl} rel="noopener noreferrer" target="_blank">
          💬 Chia sẻ Zalo
        </a>
        <a
          className={secondaryButtonClass}
          download
          href={ogImageUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          🖼️ Tải ảnh chia sẻ
        </a>
      </div>

      <div className="mt-4 border-t border-white/10 pt-4">
        <Link
          className="block w-full rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-2.5 text-center text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
          href="/tien-ich/boi-tinh-yeu"
        >
          ✨ Bói với cặp khác
        </Link>
      </div>
    </section>
  );
}

export function useShareCopyFeedback() {
  const [copied, setCopied] = useState(false);

  async function copy(shareUrl: string) {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return { copied, copy, setCopied };
}
