"use client";

import Link from "next/link";
import { STUDIO_HELP_LEGAL_LINKS, STUDIO_HELP_PAGE } from "@/lib/content/studio-help";
import { studioPath } from "@/lib/studio/constants";

type HelpHeroProps = {
  onFeedbackClick?: () => void;
};

export function HelpHero({ onFeedbackClick }: HelpHeroProps) {
  return (
    <header className="space-y-4 rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-400/10 via-transparent to-transparent p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-cyan-300/40 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
          Dành cho tác giả
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">{STUDIO_HELP_PAGE.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
          {STUDIO_HELP_PAGE.subtitle}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          className="inline-flex min-h-10 items-center justify-center rounded-full bg-cyan-300 px-4 text-sm font-bold uppercase tracking-[0.12em] text-zinc-950 shadow-[0_14px_30px_rgba(103,232,249,0.18)] transition hover:bg-cyan-200"
          href={studioPath("/stories/new")}
        >
          Tạo truyện mới
        </Link>
        <Link
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-4 text-sm font-bold uppercase tracking-[0.12em] text-zinc-100 transition hover:border-white/20"
          href={studioPath("/import")}
        >
          Nhập / xuất hàng loạt
        </Link>
        {onFeedbackClick ? (
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-4 text-sm font-bold uppercase tracking-[0.12em] text-zinc-100 transition hover:border-white/20"
            onClick={onFeedbackClick}
            type="button"
          >
            Gửi góp ý / báo lỗi
          </button>
        ) : null}
      </div>

      <p className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-100">
        {STUDIO_HELP_PAGE.disclaimer}{" "}
        {STUDIO_HELP_LEGAL_LINKS.map((link, index) => (
          <span key={link.href}>
            {index > 0 ? " · " : null}
            <Link
              className="font-semibold text-cyan-200 hover:text-cyan-100"
              href={link.href}
              rel={link.external ? "noopener noreferrer" : undefined}
              target={link.external ? "_blank" : undefined}
            >
              {link.label}
            </Link>
          </span>
        ))}
        .
      </p>
    </header>
  );
}
