"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type AvatarSize = "sm" | "md" | "lg" | "xl";

type AvatarFallbackProps = {
  name: string;
  src?: string | null;
  size?: AvatarSize;
  className?: string;
};

const sizeClasses: Record<AvatarSize, string> = {
  sm: "size-10",
  md: "size-14",
  lg: "size-16",
  xl: "size-[4.75rem]"
};

const avatarPalettes = [
  "from-cyan-400/35 via-sky-500/25 to-indigo-600/55",
  "from-fuchsia-500/35 via-violet-500/25 to-indigo-600/55",
  "from-rose-500/35 via-orange-400/25 to-red-600/55",
  "from-emerald-400/35 via-teal-500/25 to-cyan-600/55",
  "from-amber-300/35 via-orange-500/25 to-fuchsia-600/55"
];

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

type AvatarFallbackFrameProps = {
  name: string;
  src?: string | null;
  size: AvatarSize;
  className: string;
};

function markImageLoaded(image: HTMLImageElement | null) {
  return Boolean(image && image.complete && image.naturalWidth > 0);
}

function AvatarFallbackFrame({
  className,
  name,
  size,
  src
}: AvatarFallbackFrameProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const palette = useMemo(
    () => avatarPalettes[hashString(name) % avatarPalettes.length],
    [name]
  );

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [src]);

  useEffect(() => {
    if (markImageLoaded(imgRef.current)) {
      setLoaded(true);
    }
  }, [src]);

  const showImage = Boolean(src && !failed);

  return (
    <div
      className={`relative overflow-hidden rounded-full border border-white/10 ${sizeClasses[size]} ${className}`}
    >
      {!showImage ? (
        <>
          <div className={`absolute inset-0 bg-gradient-to-br ${palette}`} />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]"
          />
        </>
      ) : null}

      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={name}
          className={`absolute inset-0 h-full w-full object-cover transition duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          decoding="async"
          loading="lazy"
          onError={() => setFailed(true)}
          onLoad={() => setLoaded(true)}
          ref={imgRef}
          src={src}
        />
      ) : null}

      {showImage && !loaded ? (
        <div
          aria-hidden="true"
          className={`absolute inset-0 bg-gradient-to-br ${palette} animate-pulse`}
        />
      ) : null}
    </div>
  );
}

export function AvatarFallback(props: AvatarFallbackProps) {
  const { className = "", size = "md", ...rest } = props;

  return (
    <AvatarFallbackFrame
      key={props.src ?? props.name}
      className={className}
      size={size}
      {...rest}
    />
  );
}
