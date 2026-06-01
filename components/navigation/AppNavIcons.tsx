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

/** Bottom nav — Khám phá */
export function DiscoverNavIcon({ className = "size-5", active }: NavIconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <path
        d="M11 3a8 8 0 1 0 4.9 14.3l3.6 3.6a1.25 1.25 0 0 0 1.77-1.77l-3.6-3.6A8 8 0 0 0 11 3Zm0 2.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Z"
        fill="currentColor"
        opacity={fillOpacity(active)}
      />
    </svg>
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

/** Desktop sidebar — Ví coin */
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
