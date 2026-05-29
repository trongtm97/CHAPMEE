"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics/trackEvent";
import { analyticsEvents } from "@/lib/analytics/events";
import { recordFanScoreFromClient } from "@/lib/fans/fan-score";
import {
  exportCardToImage,
  getShareImageFilename
} from "@/lib/share/renderShareImage";
import { ShareCard } from "@/components/share/ShareCard";
import { Button, Card } from "@/components/ui";
import type { AnalyticsTargetType } from "@/types/analytics";
import type { ShareCardPayload } from "@/types/share";

type ShareModalProps = {
  open: boolean;
  payload: ShareCardPayload;
  onClose: () => void;
  onCompleted?: () => void | Promise<void>;
};

type ActionState = "idle" | "sharing" | "copying" | "downloading" | "done" | "error";

function getShareUrl(payload: ShareCardPayload) {
  return payload.url || window.location.href;
}

function getFanScoreShareScope(payload: ShareCardPayload) {
  const storyId =
    payload.storyId ?? (payload.targetType === "story" ? payload.targetId ?? null : null);
  const authorId = payload.creatorId ?? (payload.targetType === "creator" ? payload.targetId ?? null : null);

  return { authorId, storyId };
}

function normalizeAnalyticsTargetType(
  targetType: ShareCardPayload["targetType"]
): AnalyticsTargetType {
  if (!targetType) return "feed";
  if (targetType === "episode") return "episode";
  if (targetType === "story") return "story";
  if (targetType === "creator" || targetType === "profile" || targetType === "badge") {
    return "creator";
  }
  if (targetType === "feed") return "feed";
  return "page";
}

async function copyLink(url: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = url;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function ShareModal({ onClose, onCompleted, open, payload }: ShareModalProps) {
  const [status, setStatus] = useState<ActionState>("idle");

  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, open]);

  async function finishShare(eventKey: "share_clicked" | "share_copied") {
    await trackEvent({
      eventName: eventKey === "share_clicked" ? analyticsEvents.shareClicked : analyticsEvents.shareCopied,
      targetId: payload.targetId ?? null,
      targetType: normalizeAnalyticsTargetType(payload.targetType),
      metadata: { kind: payload.kind, title: payload.title }
    });
    void recordFanScoreFromClient({
      ...getFanScoreShareScope(payload),
      eventKey,
      metadata: { kind: payload.kind, title: payload.title },
      sourceId: payload.targetId ?? payload.slug ?? null
    });
    await onCompleted?.();
  }

  async function handleShare() {
    setStatus("sharing");
    const shareUrl = getShareUrl(payload);

    try {
      const imageBlob = await exportCardToImage(payload);
      const imageFile = imageBlob && typeof File !== "undefined" ? new File([imageBlob], `${getShareImageFilename(payload)}.png`, { type: "image/png" }) : null;
      const shareData: ShareData = { title: payload.title, text: payload.text, url: shareUrl };

      if (imageFile && navigator.canShare?.({ files: [imageFile] })) {
        await navigator.share({ ...shareData, files: [imageFile] });
        await finishShare("share_clicked");
      } else if (typeof navigator.share === "function") {
        await navigator.share(shareData);
        await finishShare("share_clicked");
      } else {
        await copyLink(shareUrl);
        await finishShare("share_copied");
      }

      setStatus("done");
      window.setTimeout(() => setStatus("idle"), 1400);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus("idle");
        return;
      }
      try {
        await copyLink(shareUrl);
        await finishShare("share_copied");
        setStatus("done");
        window.setTimeout(() => setStatus("idle"), 1400);
      } catch {
        setStatus("error");
        window.setTimeout(() => setStatus("idle"), 1800);
      }
    }
  }

  async function handleCopyLink() {
    setStatus("copying");
    try {
      const shareUrl = getShareUrl(payload);
      await copyLink(shareUrl);
      await finishShare("share_copied");
      setStatus("done");
      window.setTimeout(() => setStatus("idle"), 1400);
    } catch {
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 1800);
    }
  }

  async function handleDownload() {
    setStatus("downloading");
    try {
      const blob = await exportCardToImage(payload);
      if (!blob) throw new Error("Unable to generate share image");
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${getShareImageFilename(payload)}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      setStatus("done");
      window.setTimeout(() => setStatus("idle"), 1400);
    } catch {
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 1800);
    }
  }

  const statusLabel =
    status === "sharing"
      ? "Đang chia sẻ..."
      : status === "copying"
        ? "Đang sao chép..."
        : status === "downloading"
          ? "Đang tải..."
          : status === "done"
            ? "Đã xong"
            : status === "error"
              ? "Thử lại"
              : "Chia sẻ";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-4 backdrop-blur-sm sm:items-center sm:px-4">
      <button aria-label="Đóng share" className="absolute inset-0 cursor-default" onClick={onClose} type="button" />
      <Card className="relative z-10 w-full max-w-[28rem] space-y-4 p-4 sm:p-5">
        <div className="rounded-[1.25rem] border border-cyan-300/10 bg-[linear-gradient(180deg,rgba(34,211,238,0.08),rgba(255,255,255,0.03))] p-3">
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-cyan-200">Ảnh 9:16 tối ưu mobile</p>
          <p className="mt-1 text-sm leading-6 text-zinc-300">Xuất ảnh, chia sẻ hoặc tải về để đăng story, Zalo, TikTok hoặc gửi bạn bè.</p>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-300">Share preview</p>
            <h2 className="mt-2 text-xl font-black leading-tight text-white">Chia sẻ nội dung ChapMee</h2>
          </div>
          <Button onClick={onClose} type="button" variant="ghost">Đóng</Button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto rounded-[1.5rem] border border-white/10 bg-black/10 p-2">
          <ShareCard payload={payload} />
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <Button className="w-full" disabled={status === "sharing"} onClick={() => void handleShare()} type="button">{statusLabel}</Button>
          <Button className="w-full" disabled={status === "copying"} onClick={() => void handleCopyLink()} type="button" variant="secondary">Copy link</Button>
          <Button className="w-full" disabled={status === "downloading"} onClick={() => void handleDownload()} type="button" variant="ghost">Tải ảnh 9:16</Button>
        </div>

        <p className="text-xs leading-5 text-zinc-500">Nếu browser chưa hỗ trợ chia sẻ ảnh, ChapMee sẽ tự rơi về share link hoặc copy link để không làm người dùng bị kẹt.</p>
      </Card>
    </div>
  );
}
