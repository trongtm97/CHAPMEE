"use client";

import { useEffect, useMemo, useState } from "react";
import { RankingShareCard } from "@/components/rankings/RankingShareCard";
import { Button } from "@/components/ui";
import { authClient } from "@/lib/auth/browser-auth";
import {
  buildRankingShareBadgeData,
  buildRankingShareText,
  buildRankingShareUrl,
  getRankingBadgeFilename,
  isRankingShareOwner,
  type RankingShareContext
} from "@/lib/ranking/ranking-share";
import { exportRankingBadgeToImage } from "@/lib/share/renderRankingBadgeImage";

type RankingShareModalProps = {
  open: boolean;
  onClose: () => void;
  context: RankingShareContext;
};

type ActionState = "idle" | "sharing" | "copying" | "copyingLink" | "downloading" | "done" | "error";

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function RankingShareModal({ open, onClose, context }: RankingShareModalProps) {
  const [status, setStatus] = useState<ActionState>("idle");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);
    setStatus("idle");

    void authClient.getSession().then((result) => {
      const userId =
        result.data?.user?.id ??
        (result.data as { session?: { user?: { id?: string } } } | null)?.session?.user?.id ??
        null;
      setCurrentUserId(userId);
    });

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, open]);

  const shareUrl = useMemo(() => buildRankingShareUrl(context), [context]);
  const isOwner = isRankingShareOwner(context.item, currentUserId);
  const shareText = useMemo(
    () => buildRankingShareText(context, shareUrl, isOwner),
    [context, isOwner, shareUrl]
  );
  const badgeData = useMemo(
    () => buildRankingShareBadgeData(context, shareUrl),
    [context, shareUrl]
  );

  if (!open) return null;

  async function handleCopyText() {
    setStatus("copying");
    try {
      await copyText(shareText);
      setStatus("done");
      window.setTimeout(() => setStatus("idle"), 1400);
    } catch {
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 1400);
    }
  }

  async function handleCopyLink() {
    setStatus("copyingLink");
    try {
      await copyText(shareUrl);
      setStatus("done");
      window.setTimeout(() => setStatus("idle"), 1400);
    } catch {
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 1400);
    }
  }

  async function handleWebShare() {
    setStatus("sharing");
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: context.item.title,
          text: shareText,
          url: shareUrl
        });
      } else {
        await copyText(shareText);
      }
      setStatus("done");
      window.setTimeout(() => setStatus("idle"), 1400);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus("idle");
        return;
      }
      await handleCopyText();
    }
  }

  async function handleDownloadBadge() {
    setStatus("downloading");
    try {
      const blob = await exportRankingBadgeToImage(badgeData);
      if (!blob) throw new Error("Unable to generate badge");
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = getRankingBadgeFilename(badgeData);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      setStatus("done");
      window.setTimeout(() => setStatus("idle"), 1400);
    } catch {
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 1400);
    }
  }

  const actionLabel =
    status === "sharing"
      ? "Đang chia sẻ..."
      : status === "copying"
        ? "Đang sao chép..."
        : status === "copyingLink"
          ? "Đang sao chép..."
          : status === "downloading"
            ? "Đang tải..."
            : status === "done"
              ? "Đã xong"
              : status === "error"
                ? "Thử lại"
                : "Chia sẻ";

  return (
    <div
      aria-labelledby="ranking-share-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-4 backdrop-blur-sm sm:items-center sm:px-4"
      role="dialog"
    >
      <button aria-label="Đóng" className="absolute inset-0 cursor-default" onClick={onClose} type="button" />
      <div className="relative z-10 w-full max-w-lg space-y-4 rounded-2xl border border-white/12 bg-[var(--surface)] p-4 shadow-xl sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-yellow-200/90">
              Chia sẻ thành tích
            </p>
            <h2 className="mt-1 text-lg font-black text-white" id="ranking-share-title">
              Huy hiệu hạng #{context.item.rank}
            </h2>
          </div>
          <Button onClick={onClose} type="button" variant="ghost">
            Đóng
          </Button>
        </div>

        <div className="max-h-[52vh] overflow-y-auto">
          <RankingShareCard compact data={badgeData} />
        </div>

        <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm leading-6 text-zinc-300">
          {shareText}
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button className="w-full" disabled={status === "sharing"} onClick={() => void handleWebShare()} type="button">
            {actionLabel}
          </Button>
          <Button
            className="w-full"
            disabled={status === "copying"}
            onClick={() => void handleCopyText()}
            type="button"
            variant="secondary"
          >
            Copy nội dung
          </Button>
          <Button
            className="w-full"
            disabled={status === "copyingLink"}
            onClick={() => void handleCopyLink()}
            type="button"
            variant="ghost"
          >
            Copy link
          </Button>
          <Button
            className="w-full"
            disabled={status === "downloading"}
            onClick={() => void handleDownloadBadge()}
            type="button"
            variant="ghost"
          >
            Tải huy hiệu PNG
          </Button>
        </div>
      </div>
    </div>
  );
}
