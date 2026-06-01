"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useEffect } from "react";
import { studioStoryEditHref } from "@/lib/studio/ownership";
import { AddToCollectionSheet } from "@/components/collections/AddToCollectionSheet";
import { ReportModal } from "@/components/moderation";
import { ShareModal } from "@/components/share/ShareModal";
import {
  storyToggleFollowCreatorAction,
  storyToggleSaveAction
} from "@/lib/stories/story-detail-actions";
import type { StoryDetail } from "@/lib/stories/getStoryBySlug";
import type { StoryUserState } from "@/lib/stories/getStoryUserState";
import type { ShareCardPayload } from "@/types/share";

type StoryActionSheetProps = {
  open: boolean;
  onClose: () => void;
  story: StoryDetail;
  userState: StoryUserState;
  isStoryOwner: boolean;
  returnTo: string;
  sharePayload: ShareCardPayload;
};

export function StoryActionSheet({
  isStoryOwner,
  onClose,
  open,
  returnTo,
  sharePayload,
  story,
  userState
}: StoryActionSheetProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);

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

  if (!open || typeof document === "undefined") {
    return (
      <>
        {collectionOpen ? (
          <AddToCollectionSheet
            onClose={() => setCollectionOpen(false)}
            storyId={story.id}
            storyTitle={story.title}
          />
        ) : null}
        {reportOpen ? (
          <ReportModal
            defaultOpen
            hideTrigger
            key="story-report-modal"
            onClose={() => setReportOpen(false)}
            returnTo={returnTo}
            targetId={story.id}
            targetType="story"
          />
        ) : null}
        {shareOpen ? (
          <ShareModal
            key="story-share-modal"
            onClose={() => setShareOpen(false)}
            open
            payload={sharePayload}
          />
        ) : null}
      </>
    );
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
          aria-labelledby="story-action-sheet-title"
          aria-modal="true"
          className="absolute inset-x-0 bottom-0 z-10 mx-auto w-full max-w-lg rounded-t-2xl border border-white/10 bg-[#0b1016] shadow-[0_-16px_48px_rgba(0,0,0,0.45)]"
          role="dialog"
        >
          <div className="flex justify-center pt-2">
            <span className="h-1 w-10 rounded-full bg-white/15" />
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
            <h2 className="text-base font-bold text-zinc-50" id="story-action-sheet-title">
              Tùy chọn
            </h2>
            <button
              className="text-sm font-semibold text-zinc-400 hover:text-zinc-200"
              onClick={onClose}
              type="button"
            >
              Đóng
            </button>
          </div>
          <div className="max-h-[70dvh] overflow-y-auto overscroll-contain px-2 py-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            {isStoryOwner ? (
              <Link href={studioStoryEditHref(story.id)} onClick={onClose}>
                <ActionRow
                  asDiv
                  icon={<StudioIcon />}
                  subtitle="Chỉnh sửa truyện, chương và cài đặt xuất bản."
                  title="Mở trong Studio"
                  type="button"
                />
              </Link>
            ) : null}

            <form action={storyToggleSaveAction}>
              <input name="creatorId" type="hidden" value={story.creatorId ?? ""} />
              <input name="returnTo" type="hidden" value={returnTo} />
              <input name="sourceSurface" type="hidden" value="catalog" />
              <input name="trackingSurface" type="hidden" value="story_detail" />
              <input name="saved" type="hidden" value={userState.isSaved ? "false" : "true"} />
              <input name="storyId" type="hidden" value={story.id} />
              <input name="storySlug" type="hidden" value={story.slug} />
              <ActionRow
                icon={<BookmarkIcon filled={userState.isSaved} />}
                subtitle="Lưu vào tủ truyện để đọc sau."
                title={userState.isSaved ? "Đã lưu" : "Lưu truyện"}
                type="submit"
              />
            </form>

            {story.creatorId ? (
              <form action={storyToggleFollowCreatorAction}>
                <input name="creatorId" type="hidden" value={story.creatorId} />
                <input name="returnTo" type="hidden" value={returnTo} />
                <input
                  name="following"
                  type="hidden"
                  value={userState.isFollowingCreator ? "false" : "true"}
                />
                <input name="storySlug" type="hidden" value={story.slug} />
                <ActionRow
                  icon={<BellIcon active={userState.isFollowingCreator} />}
                  subtitle="Nhận thông báo khi có truyện hoặc chương mới."
                  title={
                    userState.isFollowingCreator
                      ? "Đang theo dõi tác giả"
                      : "Theo dõi tác giả"
                  }
                  type="submit"
                />
              </form>
            ) : null}

            <ActionRow
              icon={<ShareIcon />}
              onClick={() => {
                onClose();
                setShareOpen(true);
              }}
              subtitle="Gửi truyện này cho bạn bè."
              title="Chia sẻ truyện"
              type="button"
            />

            <ActionRow
              icon={<ShelfIcon />}
              onClick={() => {
                onClose();
                setCollectionOpen(true);
              }}
              subtitle="Chọn tủ truyện bạn muốn lưu."
              title="Thêm vào tủ"
              type="button"
            />

            <div className="my-2 border-t border-white/8" />

            <ActionRow
              danger
              icon={<FlagIcon />}
              onClick={() => {
                onClose();
                setReportOpen(true);
              }}
              subtitle="Báo nội dung vi phạm quy định ChapMee."
              title="Báo cáo truyện"
              type="button"
            />
          </div>
        </div>
      </div>
      {collectionOpen ? (
        <AddToCollectionSheet
          onClose={() => setCollectionOpen(false)}
          storyId={story.id}
          storyTitle={story.title}
        />
      ) : null}
    </>,
    document.body
  );
}

function ActionRow({
  asDiv,
  danger,
  icon,
  onClick,
  subtitle,
  title,
  type
}: {
  asDiv?: boolean;
  danger?: boolean;
  icon: ReactNode;
  subtitle: string;
  title: string;
  onClick?: () => void;
  type: "button" | "submit";
}) {
  const className = `tap-highlight flex min-h-[3.5rem] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.04] ${
    danger ? "text-red-200/90" : "text-zinc-100"
  }`;

  const inner = (
    <>
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          danger ? "bg-red-400/10 text-red-200" : "bg-white/[0.06] text-cyan-100"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9375rem] font-semibold leading-snug">{title}</span>
        <span
          className={`mt-0.5 block text-xs leading-5 ${
            danger ? "text-red-200/60" : "text-zinc-500"
          }`}
        >
          {subtitle}
        </span>
      </span>
      <ChevronIcon />
    </>
  );

  if (asDiv) {
    return <div className={className}>{inner}</div>;
  }

  if (type === "submit") {
    return (
      <button className={className} type="submit">
        {inner}
      </button>
    );
  }

  return (
    <button className={className} onClick={onClick} type="button">
      {inner}
    </button>
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

function ShelfIcon() {
  return (
    <svg aria-hidden className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 6h16M4 12h16M4 18h10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.75"
      />
    </svg>
  );
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
