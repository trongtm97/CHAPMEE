"use client";

import { useId } from "react";

type CrownHonorIconProps = {
  className?: string;
  muted?: boolean;
};

const CROWN_BODY =
  "M4.25 18.75L5.9 11.25C6.35 9.15 7.05 8.85 7.55 9.25L9.6 13.1L12 8.35L14.4 13.1L16.45 9.25C16.95 8.85 17.65 9.15 18.1 11.25L19.75 18.75H4.25Z";

/** Vương miện 3 chóp + 3 bi — hai tông vàng (trái sáng, phải đậm). */
export function CrownHonorIcon({ className = "size-5", muted = false }: CrownHonorIconProps) {
  const gradId = `crown-honor-${useId().replace(/:/g, "")}`;

  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id={gradId}
          x1="0"
          x2="24"
          y1="0"
          y2="0"
        >
          <stop offset="0" stopColor="#FFE566" />
          <stop offset="0.5" stopColor="#FFE566" />
          <stop offset="0.5" stopColor="#E8A020" />
          <stop offset="1" stopColor="#E8A020" />
        </linearGradient>
      </defs>
      <g fill={`url(#${gradId})`} opacity={muted ? 0.7 : 1}>
        <path d="M4.25 18.75h15.5v2.5H4.25v-2.5Z" />
        <path d={CROWN_BODY} />
        <circle cx="7.35" cy="7.75" r="1.7" />
        <circle cx="12" cy="5.55" r="1.95" />
        <circle cx="16.65" cy="7.75" r="1.7" />
      </g>
    </svg>
  );
}
