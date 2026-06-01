"use client";

import Link from "next/link";
import type { HelpOnboardingStep } from "@/lib/content/studio-help";

type HelpOnboardingPathProps = {
  steps: HelpOnboardingStep[];
};

export function HelpOnboardingPath({ steps }: HelpOnboardingPathProps) {
  return (
    <section className="scroll-mt-24 space-y-4" id="onboarding-path">
      <div>
        <h2 className="text-lg font-bold text-white">Lộ trình 6 bước để bắt đầu</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Checklist gợi ý cho tác giả mới — làm tuần tự hoặc nhảy tới bước bạn cần.
        </p>
      </div>

      <ol className="space-y-3">
        {steps.map((step) => (
          <li
            className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between"
            key={step.step}
          >
            <div className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-300/10 text-sm font-bold text-cyan-100">
                {step.step}
              </span>
              <div>
                <p className="font-semibold text-zinc-100">{step.title}</p>
                <p className="mt-1 text-sm leading-6 text-zinc-500">{step.description}</p>
              </div>
            </div>
            {step.href && step.actionLabel ? (
              <Link
                className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-zinc-100 transition hover:border-cyan-300/40 hover:text-cyan-100 sm:ml-4"
                href={step.href}
              >
                {step.actionLabel}
              </Link>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
