"use client";

import Link from "next/link";

type StreakPillProps = {
  days: number;
  href?: string;
  variant?: "streak" | "mission";
};

export function StreakPill({ days, href = "/missions", variant = "streak" }: StreakPillProps) {
  if (days <= 0 && variant === "streak") {
    return null;
  }

  const label = variant === "mission" ? "🎁" : `🔥 ${days}`;

  return (
    <Link
      aria-label={variant === "mission" ? "Mở nhiệm vụ" : `Chuỗi đọc ${days} ngày`}
      className="tap-highlight relative z-10 inline-flex min-h-10 shrink-0 items-center px-1 text-xs font-semibold text-orange-200 transition active:text-orange-100"
      href={href}
    >
      <span className="leading-none">{label}</span>
    </Link>
  );
}
