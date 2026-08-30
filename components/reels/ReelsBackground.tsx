"use client";

import { useState, type CSSProperties } from "react";

type ReelsBackgroundProps = {
  genreName: string | null;
  imageUrl: string | null;
  priority?: boolean;
};

const genreThemes = [
  {
    glow:
      "radial-gradient(circle at 18% 18%, rgba(251, 191, 36, 0.3), transparent 28%), radial-gradient(circle at 80% 10%, rgba(244, 114, 182, 0.18), transparent 24%)",
    wash:
      "linear-gradient(145deg, rgba(30, 41, 59, 0.96) 0%, rgba(17, 24, 39, 0.86) 55%, rgba(9, 12, 18, 0.98) 100%)"
  },
  {
    glow:
      "radial-gradient(circle at 22% 14%, rgba(45, 212, 191, 0.26), transparent 30%), radial-gradient(circle at 85% 18%, rgba(59, 130, 246, 0.2), transparent 28%)",
    wash:
      "linear-gradient(145deg, rgba(8, 47, 73, 0.96) 0%, rgba(15, 23, 42, 0.84) 58%, rgba(4, 7, 12, 0.98) 100%)"
  },
  {
    glow:
      "radial-gradient(circle at 18% 18%, rgba(192, 132, 252, 0.24), transparent 28%), radial-gradient(circle at 82% 12%, rgba(248, 113, 113, 0.18), transparent 26%)",
    wash:
      "linear-gradient(145deg, rgba(49, 26, 69, 0.96) 0%, rgba(24, 24, 27, 0.84) 58%, rgba(8, 8, 10, 0.98) 100%)"
  },
  {
    glow:
      "radial-gradient(circle at 18% 18%, rgba(74, 222, 128, 0.22), transparent 26%), radial-gradient(circle at 86% 16%, rgba(14, 165, 233, 0.15), transparent 28%)",
    wash:
      "linear-gradient(145deg, rgba(20, 83, 45, 0.94) 0%, rgba(17, 24, 39, 0.84) 58%, rgba(7, 10, 16, 0.98) 100%)"
  }
];

function hashGenre(value: string | null) {
  if (!value) {
    return 0;
  }

  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % genreThemes.length;
  }

  return hash;
}

export function ReelsBackground({
  genreName,
  imageUrl,
  priority = false
}: ReelsBackgroundProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = imageUrl && !imageFailed;
  const theme = genreThemes[hashGenre(genreName)];
  const patternStyle: CSSProperties = {
    backgroundImage: `${theme.glow}, ${theme.wash}`,
    backgroundSize: "cover"
  };

  return (
    <>
      {showImage ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
            decoding="async"
            fetchPriority={priority ? "high" : "low"}
            loading={priority ? "eager" : "lazy"}
            onError={() => setImageFailed(true)}
            src={imageUrl}
          />
          <div aria-hidden="true" className="absolute inset-0 bg-black/40" />
        </>
      ) : null}
      <div
        aria-hidden="true"
        className={`absolute inset-0 transition-opacity duration-300 ${
          showImage ? "opacity-70" : "opacity-100"
        }`}
        style={patternStyle}
      />
      <div
        aria-hidden="true"
        className={`absolute inset-0 ${
          showImage
            ? "bg-[linear-gradient(180deg,rgba(5,8,13,0.55)_0%,rgba(5,8,13,0.68)_38%,rgba(5,8,13,0.9)_76%,rgba(5,8,13,0.98)_100%)]"
            : "bg-[linear-gradient(180deg,rgba(5,8,13,0.35)_0%,rgba(5,8,13,0.5)_40%,rgba(5,8,13,0.82)_78%,rgba(5,8,13,0.96)_100%)]"
        }`}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_30%)]"
      />
    </>
  );
}
