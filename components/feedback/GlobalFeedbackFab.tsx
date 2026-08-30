"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FeedbackSheet } from "@/components/me/FeedbackSheet";
import { useDraggableFabPosition } from "@/hooks/useDraggableFabPosition";
import { DEFAULT_CONTACT_SETTINGS } from "@/lib/settings/default-contact-settings";
import { isFeedbackFormVisible } from "@/lib/settings/contact-settings-mapper";
import type { ContactSettings } from "@/types/contact-settings";

type GlobalFeedbackFabProps = {
  settings: ContactSettings;
  userEmail?: string | null;
};

function shouldHideFab(pathname: string): boolean {
  if (pathname.startsWith("/admin")) return true;
  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password"
  ) {
    return true;
  }
  return false;
}

function resolveFeedbackSettings(settings: ContactSettings): ContactSettings {
  if (isFeedbackFormVisible(settings)) {
    return settings;
  }
  return {
    ...DEFAULT_CONTACT_SETTINGS,
    enableFeedbackForm: true,
    allowedFeedbackTypes:
      settings.allowedFeedbackTypes.length > 0
        ? settings.allowedFeedbackTypes
        : DEFAULT_CONTACT_SETTINGS.allowedFeedbackTypes,
    requireLogin: settings.requireLogin
  };
}

const FAB_BASE_CLASS =
  "tap-highlight fixed z-[100] flex touch-none select-none items-center justify-center rounded-full border border-cyan-300/35 bg-gradient-to-br from-cyan-400 to-cyan-500 text-xs font-bold text-zinc-950 shadow-lg shadow-cyan-950/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 md:gap-1.5 md:rounded-full md:px-4 md:py-2.5 size-12 md:h-auto md:w-auto md:min-h-10";

export function GlobalFeedbackFab({ settings, userEmail }: GlobalFeedbackFabProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const {
    position,
    isDragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel
  } = useDraggableFabPosition();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (shouldHideFab(pathname)) {
    return null;
  }

  const feedbackSettings = resolveFeedbackSettings(settings);
  const isPositioned = position != null;

  const fab = (
    <>
      <button
        aria-label="Góp ý cho ChapMee — giữ và kéo để di chuyển"
        className={`${FAB_BASE_CLASS} ${
          isDragging
            ? "scale-105 cursor-grabbing transition-none"
            : "cursor-grab transition-transform hover:scale-105 hover:from-cyan-300 hover:to-cyan-400"
        } ${
          isPositioned
            ? ""
            : "bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-3 md:bottom-6 md:right-6"
        }`}
        onPointerCancel={onPointerCancel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => {
          const moved = onPointerUp(event);
          if (!moved) {
            setOpen(true);
          }
        }}
        style={
          isPositioned
            ? {
                left: position.x,
                top: position.y,
                right: "auto",
                bottom: "auto"
              }
            : undefined
        }
        type="button"
      >
        <svg aria-hidden className="pointer-events-none size-5 md:size-4" fill="none" viewBox="0 0 24 24">
          <path
            d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
        <span className="pointer-events-none hidden md:inline">Góp ý</span>
      </button>

      {open ? (
        <FeedbackSheet
          onClose={() => setOpen(false)}
          pagePath={pathname}
          settings={feedbackSettings}
          userEmail={userEmail}
        />
      ) : null}
    </>
  );

  if (!mounted) {
    return null;
  }

  return createPortal(fab, document.body);
}
