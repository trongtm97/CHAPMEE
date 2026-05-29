"use client";

import { useMemo, useState } from "react";

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

const initialsSizeClasses: Record<AvatarSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-sm",
  xl: "text-base"
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

function getInitials(name: string) {
  const tokens = name.split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return "C";
  }

  if (tokens.length === 1) {
    return tokens[0][0]?.toUpperCase() ?? "C";
  }

  return `${tokens[0][0] ?? ""}${tokens[1][0] ?? ""}`.toUpperCase();
}

type AvatarFallbackFrameProps = {
  name: string;
  src?: string | null;
  size: AvatarSize;
  className: string;
};

function AvatarFallbackFrame({
  className,
  name,
  size,
  src
}: AvatarFallbackFrameProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const palette = useMemo(
    () => avatarPalettes[hashString(name) % avatarPalettes.length],
    [name]
  );

  const initials = getInitials(name);

  return (
    <div
      className={`relative overflow-hidden rounded-full border border-white/10 ${sizeClasses[size]} ${className}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${palette}`} />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]"
      />

      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={name}
          className={`absolute inset-0 h-full w-full object-cover transition duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          loading="lazy"
          onError={() => setFailed(true)}
          onLoad={() => setLoaded(true)}
          src={src}
        />
      ) : null}

      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`font-black uppercase tracking-[0.14em] text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.2)] ${initialsSizeClasses[size]}`}
        >
          {initials}
        </span>
      </div>
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
