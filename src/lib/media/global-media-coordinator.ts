"use client";

/** Dispatched when external global audio starts so embedded YouTube iframes stop. */
export const PAUSE_EMBEDDED_MEDIA_EVENT = "chapmee:pause-embedded-media";

export const CHAPMee_YOUTUBE_EMBED_ATTR = "data-chapmee-youtube-embed";

const YOUTUBE_PAUSE_MESSAGE = JSON.stringify({
  event: "command",
  func: "pauseVideo",
  args: ""
});

function pauseYoutubeIframesViaPostMessage() {
  if (typeof document === "undefined") return;
  document.querySelectorAll(`iframe[${CHAPMee_YOUTUBE_EMBED_ATTR}="true"]`).forEach((node) => {
    const iframe = node as HTMLIFrameElement;
    try {
      iframe.contentWindow?.postMessage(YOUTUBE_PAUSE_MESSAGE, "*");
    } catch {
      // cross-origin — remount handler may still run
    }
  });
}

export function pauseEmbeddedMedia() {
  if (typeof window === "undefined") return;
  pauseYoutubeIframesViaPostMessage();
  window.dispatchEvent(new CustomEvent(PAUSE_EMBEDDED_MEDIA_EVENT));
}

export function subscribeEmbeddedMediaPause(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(PAUSE_EMBEDDED_MEDIA_EVENT, listener);
  return () => window.removeEventListener(PAUSE_EMBEDDED_MEDIA_EVENT, listener);
}
