/**
 * Mobile Reels layout insets.
 * Bottom nav height is reserved by AppShell main padding — do not add it again here.
 */
export const REELS_MOBILE_BOTTOM_NAV_HEIGHT = "3.25rem";

/** CTA card (~5rem) + gap — reserves space so text does not overlap CTA. */
export const REELS_CONTENT_BOTTOM_INSET = "5.5rem";

/** CTA sits flush above the bottom edge of the reel cell (nav is outside). */
export const REELS_CTA_BOTTOM_INSET = "0.35rem";

/** Left/right readable margin (aligned text + CTA). */
export const REELS_GUTTER_LEFT = "1.25rem";

/** Right margin + action rail column (~4.25rem). */
export const REELS_GUTTER_RIGHT = "calc(1.25rem + 4.25rem)";

/** Tailwind classes for overlay content horizontal insets. */
export const REELS_GUTTER_X_CLASS = "pl-5 pr-[calc(1.25rem+4.25rem)]";

export const reelsContentPadding = {
  contentBottom: REELS_CONTENT_BOTTOM_INSET,
  ctaBottom: REELS_CTA_BOTTOM_INSET
} as const;
