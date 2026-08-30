import Image from "next/image";
import { CrownHonorIcon } from "@/components/navigation/CrownHonorIcon";
import { cn } from "@/lib/utils/cn";

type NavIconProps = {
  className?: string;
  active?: boolean;
};

function fillOpacity(active?: boolean) {
  if (active === undefined) return 1;
  return active ? 1 : 0.85;
}

/** Bottom nav — Reels */
export function ReelsNavIcon({ className = "size-5", active }: NavIconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5v-13Zm6.75 3.25 6.5 3.75a.75.75 0 0 1 0 1.3l-6.5 3.75A.75.75 0 0 1 10 16.8V7.2a.75.75 0 0 1 .75-.45Z"
        fill="currentColor"
        opacity={fillOpacity(active)}
      />
    </svg>
  );
}

/** Nav — Tiện ích (ngôi sao 5 cánh xanh lá) */
export function UtilitiesNavIcon({ className, active }: NavIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={cn("size-5 shrink-0 text-emerald-400", className)}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        d="M12 2.5l2.47 5.01 5.53.8-4 3.9.94 5.5L12 15.9l-4.94 2.6.94-5.5-4-3.9 5.53-.8L12 2.5z"
        opacity={fillOpacity(active)}
      />
    </svg>
  );
}

/** Sidebar Khám phá — Bói tình yêu */
export function LoveNavIcon({ className = "size-5", active }: NavIconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill="currentColor"
        opacity={fillOpacity(active)}
      />
    </svg>
  );
}

/** Bottom nav — Khám phá */
export function DiscoverNavIcon({ className = "size-5", active }: NavIconProps) {
  return (
    <span
      className={`relative inline-flex ${className} overflow-hidden rounded-full ${
        active === false ? "opacity-85 saturate-75 brightness-110" : ""
      }`}
    >
      <Image alt="" aria-hidden="true" className="object-contain" fill sizes="20px" src="/icons/idea.png" />
    </span>
  );
}

/** Bottom nav — Cộng đồng */
export function CommunityNavIcon({ className = "size-5", active }: NavIconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <path
        d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8A2.5 2.5 0 0 1 17.5 17H11l-4.2 3.15A1 1 0 0 1 5 19.35V17H6.5A2.5 2.5 0 0 1 4 14.5v-8Z"
        fill="currentColor"
        opacity={fillOpacity(active)}
      />
    </svg>
  );
}

/** Bottom nav — Tôi / Hồ sơ */
export function ProfileNavIcon({ className = "size-5", active }: NavIconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <path
        d="M12 12a4.25 4.25 0 1 0-4.25-4.25A4.25 4.25 0 0 0 12 12Zm-7.5 8.25a7.5 7.5 0 0 1 15 0 .75.75 0 0 1-.75.75h-13.5a.75.75 0 0 1-.75-.75Z"
        fill="currentColor"
        opacity={fillOpacity(active)}
      />
    </svg>
  );
}

/** Nav — Bảng xếp hạng (vương miện vinh danh) */
export function RankingNavIcon({ className = "size-5", active }: NavIconProps) {
  return <CrownHonorIcon className={className} muted={active === false} />;
}

/** Discover quick link — Bài viết */
export function ArticleNavIcon({ className = "size-5", active }: NavIconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2 5 5h-5V4zM8 13h8v2H8v-2zm0 4h5v2H8v-2z"
        fill="currentColor"
        opacity={fillOpacity(active)}
      />
    </svg>
  );
}

/** Bottom nav — Media (audio & video) */
export function MediaNavIcon({ className = "size-5", active }: NavIconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <path
        d="M5.5 4.25A1.75 1.75 0 0 1 7.25 2.5h9.5A1.75 1.75 0 0 1 18.5 4.25v2.35L12 3.35 5.5 6.6V4.25Zm0 4.55 6.5 2.83 6.5-2.83v8.97A1.75 1.75 0 0 1 17.25 19h-9.5A1.75 1.75 0 0 1 5.5 17.27V8.8Z"
        fill="currentColor"
        opacity={fillOpacity(active)}
      />
    </svg>
  );
}

/** Nav — Video / phim chuyển thể */
export function VideoNavIcon({ className = "size-5", active }: NavIconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <path
        d="M4 6.5A2.5 2.5 0 0 1 6.5 4h7.75v16H6.5A2.5 2.5 0 0 1 4 17.5v-11Zm11.75-2.5h3.75A2.5 2.5 0 0 1 22 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-3.75V4ZM10 8.25l6.5 3.75a.75.75 0 0 1 0 1.3L10 17.05V8.25Z"
        fill="currentColor"
        opacity={fillOpacity(active)}
      />
    </svg>
  );
}

/** Dedicated nav icon — Audio (legacy / discover shortcuts) */
export function AudioNavIcon({ className = "size-5", active }: NavIconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <path
        d="M14.25 4.5a.75.75 0 0 1 .75.75v8.7a3.75 3.75 0 1 1-1.5-3V7.3l-4.7 1.15v6a3.75 3.75 0 1 1-1.5-3V7.25a.75.75 0 0 1 .57-.73l6-1.5a.8.8 0 0 1 .18-.02Z"
        fill="currentColor"
        opacity={fillOpacity(active)}
      />
    </svg>
  );
}

/** Desktop sidebar — Danh mục truyện (filled, cùng phong cách mobile) */
export function LibraryNavIcon({ className = "size-5", active }: NavIconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <path
        d="M5.5 4A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20h3V4h-3Zm5 0v16h4V4h-4Zm6 0h-2v16h2A1.5 1.5 0 0 0 20 18.5v-13A1.5 1.5 0 0 0 18.5 4Z"
        fill="currentColor"
        opacity={fillOpacity(active)}
      />
    </svg>
  );
}

/** Dedicated nav icon — Truyen Sang Tac */
export function OriginalStoryNavIcon({ className = "size-5", active }: NavIconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <path
        d="M12 2.75 14.75 8l5.75.8-4.15 4.03.98 5.67L12 15.7l-5.33 2.8.98-5.67L3.5 8.8 9.25 8 12 2.75Z"
        fill="currentColor"
        opacity={fillOpacity(active)}
      />
    </svg>
  );
}

/** Dedicated nav icon — Truyen Dich */
export function TranslationStoryNavIcon({ className = "size-5", active }: NavIconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3h5A2.5 2.5 0 0 1 14 5.5V7h3.5A2.5 2.5 0 0 1 20 9.5v9a2.5 2.5 0 0 1-2.5 2.5h-5A2.5 2.5 0 0 1 10 18.5V17H6.5A2.5 2.5 0 0 1 4 14.5v-9Zm4.1 2.9h2.7L9.4 13h2l.7-1.8h2L11.3 16h-2l-1.2-2.6L6.9 16H5l3.1-5.1H6.4l.7-1.5Zm5.4 1.4v7.2h3V16h-1v-1.5h1V13h-1v-1.5h1V9.8h-3Z"
        fill="currentColor"
        opacity={fillOpacity(active)}
      />
    </svg>
  );
}

/** Header CTA — Viết truyện */
export function WriteNavIcon({ className = "size-5", active }: NavIconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <path
        d="M4 20h4.5l9.15-9.15a2.12 2.12 0 0 0-3-3L5.5 17V20Zm2.1 0V18.3L15.4 9l1.6 1.6L7.7 20H6.1ZM17 7.4l-1.4-1.4 1.3-1.3a1 1 0 0 1 1.4 0l0 0a1 1 0 0 1 0 1.4L17 7.4Z"
        fill="currentColor"
        opacity={fillOpacity(active)}
      />
    </svg>
  );
}

/** Desktop sidebar — Studio */
export function StudioNavIcon({ className = "size-5", active }: NavIconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <path
        d="M4 20h4.5l9.15-9.15a2.12 2.12 0 0 0-3-3L5.5 17V20Zm2.1 0V18.3L15.4 9l1.6 1.6L7.7 20H6.1ZM17 7.4l-1.4-1.4 1.3-1.3a1 1 0 0 1 1.4 0l0 0a1 1 0 0 1 0 1.4L17 7.4Z"
        fill="currentColor"
        opacity={fillOpacity(active)}
      />
    </svg>
  );
}

/** Desktop sidebar — Ví Xu */
export function WalletNavIcon({ className = "size-5", active }: NavIconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <path
        d="M5.5 5A2.5 2.5 0 0 0 3 7.5v9A2.5 2.5 0 0 0 5.5 19h13A2.5 2.5 0 0 0 21 16.5v-9A2.5 2.5 0 0 0 18.5 5h-13Zm13 8.25h-2a1.25 1.25 0 1 1 0-2.5h2v2.5Z"
        fill="currentColor"
        opacity={fillOpacity(active)}
      />
    </svg>
  );
}
