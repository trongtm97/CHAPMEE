"use client";

import { useState } from "react";

type ProfileShareButtonProps = {
  shareText?: string;
  shareUrl: string;
  title: string;
  buttonClassName?: string;
  iconClassName?: string;
};

function ShareIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8.4 10.8 15.6 7.2M8.4 13.2l7.2 3.6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

async function copyShareUrl(url: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = url;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function ProfileShareButton({
  buttonClassName = "tap-highlight inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/8 bg-white/[0.04] text-zinc-400 transition hover:border-white/12 hover:bg-white/[0.06] hover:text-zinc-200",
  iconClassName = "size-3.5",
  shareText,
  shareUrl,
  title
}: ProfileShareButtonProps) {
  const [toast, setToast] = useState<string | null>(null);

  async function handleShare() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title,
          text: shareText ?? title,
          url: shareUrl
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    try {
      await copyShareUrl(shareUrl);
      setToast("Đã sao chép liên kết hồ sơ.");
      window.setTimeout(() => setToast(null), 2400);
    } catch {
      setToast("Không thể chia sẻ hồ sơ.");
      window.setTimeout(() => setToast(null), 2400);
    }
  }

  return (
    <>
      <button
        aria-label="Chia sẻ hồ sơ"
        className={buttonClassName}
        onClick={() => void handleShare()}
        type="button"
      >
        <ShareIcon className={iconClassName} />
      </button>

      {toast ? (
        <div
          aria-live="polite"
          className="pointer-events-none fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-50 mx-auto max-w-sm rounded-full border border-white/10 bg-[#121820]/95 px-4 py-2.5 text-center text-xs font-medium text-zinc-100 shadow-lg backdrop-blur-md"
          role="status"
        >
          {toast}
        </div>
      ) : null}
    </>
  );
}
