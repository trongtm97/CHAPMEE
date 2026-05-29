"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ReportModal } from "@/components/moderation";
import { ShareModal } from "@/components/share/ShareModal";
import {
  readerToggleFollowAction,
  readerToggleSaveAction
} from "@/lib/reader/reader-menu-actions";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import { studioEpisodeEditHref } from "@/lib/studio/ownership";
import type { ShareCardPayload } from "@/types/share";

type ReaderActionSheetProps = {
  open: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
  storyId: string;
  storySlug: string;
  creatorId: string | null;
  returnTo: string;
  isSaved: boolean;
  isFollowingCreator: boolean;
  isLoggedIn: boolean;
  isStoryOwner: boolean;
  sharePayload: ShareCardPayload;
  chapterId: string;
};

export function ReaderActionSheet(props: ReaderActionSheetProps) {
  const {
    chapterId,
    creatorId,
    isFollowingCreator,
    isLoggedIn,
    isSaved,
    isStoryOwner,
    onClose,
    onOpenSettings,
    open,
    returnTo,
    sharePayload,
    storyId,
    storySlug
  } = props;

  const [reportOpen, setReportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  const overlays = (
    <>
      {reportOpen ? (
        <ReportModal
          defaultOpen
          hideTrigger
          key="reader-report-modal"
          onClose={() => setReportOpen(false)}
          returnTo={returnTo}
          targetId={chapterId}
          targetType="chapter"
        />
      ) : null}
      {shareOpen ? (
        <ShareModal
          key="reader-share-modal"
          onClose={() => setShareOpen(false)}
          open
          payload={sharePayload}
        />
      ) : null}
    </>
  );

  async function handleShare() {
    onClose();
    const url = sharePayload.url ?? (typeof window !== "undefined" ? window.location.href : "");
    const title = sharePayload.title ?? "ChapMee";
    const text = sharePayload.text ?? sharePayload.excerpt ?? "";

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
      }
    }

    setShareOpen(true);
  }

  if (!open || typeof document === "undefined") {
    return overlays;
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-[200]">
        <button
          aria-label="Đóng"
          className="absolute inset-0 bg-black/55"
          onClick={onClose}
          type="button"
        />
        <div
          aria-labelledby="reader-action-sheet-title"
          aria-modal="true"
          className="absolute inset-x-0 bottom-0 z-10 mx-auto w-full max-w-lg rounded-t-[1.25rem] border border-white/10 border-b-0 bg-[#0b1016] shadow-[0_-16px_48px_rgba(0,0,0,0.45)]"
          role="dialog"
        >
          <div className="flex justify-center pt-2.5">
            <span className="h-1 w-10 rounded-full bg-white/15" aria-hidden />
          </div>

          <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-1">
            <h2 className="text-base font-semibold text-zinc-50" id="reader-action-sheet-title">
              Tùy chọn
            </h2>
            <button
              className="min-h-9 rounded-full px-3 text-sm font-medium text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
              onClick={onClose}
              type="button"
            >
              Đóng
            </button>
          </div>

          <div className="max-h-[70dvh] overflow-y-auto overscroll-contain px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
            {isStoryOwner ? (
              <Link
                href={studioEpisodeEditHref(storyId, chapterId)}
                onClick={onClose}
              >
                <ActionRow
                  asDiv
                  icon={<StudioIcon />}
                  subtitle="Chỉnh sửa nội dung và cài đặt chương."
                  title="Sửa trong Studio"
                  type="button"
                />
              </Link>
            ) : null}

            <form action={readerToggleSaveAction}>
              <input name="creatorId" type="hidden" value={creatorId ?? ""} />
              <input name="returnTo" type="hidden" value={returnTo} />
              <input name="saved" type="hidden" value={isSaved ? "false" : "true"} />
              <input name="storyId" type="hidden" value={storyId} />
              <input name="storySlug" type="hidden" value={storySlug} />
              <ActionRow
                active={isSaved}
                icon={<BookmarkIcon filled={isSaved} />}
                showCheck={isSaved}
                subtitle="Lưu vào tủ truyện để đọc sau."
                title={isSaved ? "Đã lưu" : "Lưu truyện"}
                type="submit"
              />
            </form>

            {creatorId ? (
              <form action={readerToggleFollowAction}>
                <input name="creatorId" type="hidden" value={creatorId} />
                <input name="returnTo" type="hidden" value={returnTo} />
                <input
                  name="following"
                  type="hidden"
                  value={isFollowingCreator ? "false" : "true"}
                />
                <input name="storySlug" type="hidden" value={storySlug} />
                <ActionRow
                  active={isFollowingCreator}
                  icon={<BellIcon active={isFollowingCreator} />}
                  showCheck={isFollowingCreator}
                  subtitle="Nhận thông báo khi có chương mới."
                  title={isFollowingCreator ? "Đang theo dõi" : "Theo dõi tác giả"}
                  type="submit"
                />
              </form>
            ) : null}

            <ActionRow
              icon={<ShareIcon />}
              onClick={() => void handleShare()}
              subtitle="Gửi chương này cho bạn bè."
              title="Chia sẻ"
              type="button"
            />

            <Link href={getStoryDetailHref(storySlug)} onClick={onClose}>
              <ActionRow
                asDiv
                icon={<BookIcon />}
                subtitle="Xem giới thiệu, danh sách chương và bình luận."
                title="Mở trang truyện"
                type="button"
              />
            </Link>

            {onOpenSettings ? (
              <ActionRow
                icon={<AaIcon />}
                muted
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                subtitle="Đổi cỡ chữ, nền và giãn dòng."
                title="Cài đặt đọc"
                type="button"
              />
            ) : null}

            {!isLoggedIn ? (
              <p className="px-3 py-2 text-center text-xs leading-5 text-zinc-500">
                Đăng nhập để lưu truyện, theo dõi và báo cáo.
              </p>
            ) : null}

            <div className="my-1 border-t border-white/[0.06]" />

            <ActionRow
              danger
              icon={<FlagIcon />}
              onClick={() => {
                onClose();
                setReportOpen(true);
              }}
              subtitle="Báo nội dung vi phạm quy định ChapMee."
              title="Báo cáo"
              type="button"
            />
          </div>
        </div>
      </div>
      {overlays}
    </>,
    document.body
  );
}

function ActionRow({
  active,
  asDiv,
  danger,
  icon,
  muted,
  onClick,
  showCheck,
  subtitle,
  title,
  type
}: {
  active?: boolean;
  asDiv?: boolean;
  danger?: boolean;
  icon: ReactNode;
  muted?: boolean;
  onClick?: () => void;
  showCheck?: boolean;
  subtitle: string;
  title: string;
  type: "button" | "submit";
}) {
  const className = `tap-highlight flex min-h-[3.75rem] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.04] active:bg-white/[0.06] ${
    active ? "bg-cyan-300/[0.06]" : ""
  }`;

  const inner = (
    <>
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          danger
            ? "bg-red-400/10 text-red-300/90"
            : muted
              ? "bg-white/[0.04] text-zinc-400"
              : "bg-white/[0.06] text-cyan-100/90"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-[0.9375rem] font-semibold leading-snug ${
            danger ? "text-red-200/90" : "text-zinc-100"
          }`}
        >
          {title}
        </span>
        <span
          className={`mt-0.5 block line-clamp-2 text-xs leading-5 ${
            danger ? "text-red-200/55" : "text-zinc-500"
          }`}
        >
          {subtitle}
        </span>
      </span>
      {showCheck ? <CheckIcon /> : <ChevronIcon />}
    </>
  );

  if (asDiv) {
    return <div className={className}>{inner}</div>;
  }

  const ariaLabel = `${title}. ${subtitle}`;

  if (type === "submit") {
    return (
      <button aria-label={ariaLabel} className={className} type="submit">
        {inner}
      </button>
    );
  }

  return (
    <button aria-label={ariaLabel} className={className} onClick={onClick} type="button">
      {inner}
    </button>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden className="h-5 w-5 shrink-0 text-cyan-300" fill="none" viewBox="0 0 24 24">
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg aria-hidden className="h-4 w-4 shrink-0 text-zinc-600" fill="none" viewBox="0 0 24 24">
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden className="h-5 w-5" fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24">
      <path
        d="M6 4a2 2 0 012-2h8a2 2 0 012 2v17l-7-3.5L6 21V4z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
    </svg>
  );
}

function BellIcon({ active }: { active: boolean }) {
  return (
    <svg aria-hidden className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M15 17H9l1 2h4l1-2zm-3-13a4 4 0 014 4v3l2 3H6l2-3V8a4 4 0 014-4z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
      {active ? <circle cx="18" cy="5" fill="currentColor" r="2.5" /> : null}
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg aria-hidden className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M8 12l8-4v3a4 4 0 014 4M8 12l8 4v-3a4 4 0 00-4-4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg aria-hidden className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M5 5a2 2 0 012-2h5.5a1 1 0 01.7.3l2.8 2.6a1 1 0 00.7.3H19a2 2 0 012 2v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
    </svg>
  );
}

function AaIcon() {
  return <span className="text-sm font-bold tracking-tight">Aa</span>;
}

function FlagIcon() {
  return (
    <svg aria-hidden className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M5 21V5M5 5h11l-2 3 2 3H5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
    </svg>
  );
}

function StudioIcon() {
  return (
    <svg aria-hidden className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 20h4l10.5-10.5a2.1 2.1 0 00-3-3L5 17v3zM14 6l3 3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
    </svg>
  );
}
