import Link from "next/link";
import type { ReactNode } from "react";

type AuthPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  accentLabel: string;
  accentValue: string;
  accentDetail: string;
  primaryCtaHref: string;
  primaryCtaLabel: string;
  secondaryCtaHref: string;
  secondaryCtaLabel: string;
  children: ReactNode;
  highlights: Array<{
    title: string;
    body: string;
  }>;
};

export function AuthPageShell({
  eyebrow,
  title,
  description,
  accentLabel,
  accentValue,
  accentDetail,
  primaryCtaHref,
  primaryCtaLabel,
  secondaryCtaHref,
  secondaryCtaLabel,
  children,
  highlights
}: AuthPageShellProps) {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.22),transparent_26rem),radial-gradient(circle_at_top_right,rgba(251,191,36,0.16),transparent_20rem)]" />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[1.06fr_minmax(0,28rem)] lg:gap-10 lg:px-8 lg:py-12">
        <div className="relative order-1 lg:order-2">
          <div className="absolute inset-x-10 top-6 -z-10 h-40 rounded-full bg-sky-300/20 blur-3xl" />
          <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(16,23,34,0.96),rgba(9,13,20,0.96))] p-4 shadow-[0_35px_90px_rgba(0,0,0,0.34)] backdrop-blur sm:p-5">
            {children}
          </div>
        </div>

        <div className="order-2 space-y-7 lg:order-1">
          <div className="space-y-5">
            <span className="inline-flex rounded-full border border-sky-300/20 bg-sky-300/10 px-4 py-1 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-sky-200">
              {eyebrow}
            </span>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-black leading-[1.02] tracking-[-0.03em] text-white sm:text-5xl lg:text-[3.75rem]">
                {title}
              </h1>
              <p className="max-w-2xl text-[1.02rem] leading-8 text-slate-300 sm:text-lg">
                {description}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)] backdrop-blur">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200/80">
                    {accentLabel}
                  </p>
                  <p className="text-2xl font-black tracking-[-0.03em] text-white sm:text-[2rem]">
                    {accentValue}
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
                  ChapMee ID
                </div>
              </div>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
                {accentDetail}
              </p>
            </div>

            <div className="grid gap-4">
              <Link
                className="inline-flex min-h-[3.25rem] items-center justify-center rounded-full bg-sky-300 px-5 text-sm font-bold uppercase tracking-[0.14em] text-slate-950 transition hover:bg-sky-200"
                href={primaryCtaHref}
              >
                {primaryCtaLabel}
              </Link>
              <Link
                className="inline-flex min-h-[3.25rem] items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:border-white/20 hover:bg-white/[0.08]"
                href={secondaryCtaHref}
              >
                {secondaryCtaLabel}
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {highlights.map((item) => (
              <article
                className="rounded-[1.6rem] border border-white/10 bg-slate-950/35 p-5 shadow-[0_18px_44px_rgba(0,0,0,0.18)] backdrop-blur"
                key={item.title}
              >
                <p className="text-sm font-bold text-white">{item.title}</p>
                <p className="mt-2 text-sm leading-7 text-slate-300">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
