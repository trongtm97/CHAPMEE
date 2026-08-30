"use client";

import { useEffect, useMemo, useState } from "react";
import {
  emojiForClipboard,
  emojiToTwemojiSrcCandidates,
  isFlagEmoji,
  normalizeEmojiString
} from "@/lib/utilities/emoji-twemoji";
import styles from "./icon-picker.module.css";

type IconGlyphProps = {
  emoji: string;
  size?: number;
};

export function IconGlyph({ emoji, size = 26 }: IconGlyphProps) {
  const normalized = useMemo(() => normalizeEmojiString(emoji), [emoji]);
  const candidates = useMemo(() => emojiToTwemojiSrcCandidates(normalized), [normalized]);
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
  }, [normalized]);

  if (!normalized) {
    return null;
  }

  if (candidateIndex >= candidates.length) {
    if (isFlagEmoji(normalized)) {
      return (
        <span
          aria-hidden="true"
          className={styles.iconGlyphFallback}
          style={{ fontSize: Math.round(size * 0.45), fontWeight: 700 }}
        >
          ?
        </span>
      );
    }

    return (
      <span
        aria-hidden="true"
        className={styles.iconGlyphNative}
        style={{ fontSize: Math.round(size * 0.92) }}
      >
        {normalized}
      </span>
    );
  }

  return (
    <img
      alt=""
      aria-hidden="true"
      className={styles.iconGlyphImg}
      draggable={false}
      height={size}
      loading="lazy"
      onError={() => setCandidateIndex((current) => current + 1)}
      src={candidates[candidateIndex]}
      width={size}
    />
  );
}

export { emojiForClipboard };
