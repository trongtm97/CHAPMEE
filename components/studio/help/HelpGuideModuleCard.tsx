import Link from "next/link";
import { Card } from "@/components/ui";
import type { HelpModuleBadge, StudioHelpGuideModule } from "@/lib/content/studio-help";

const BADGE_LABELS: Record<HelpModuleBadge, string> = {
  attention: "Cần chú ý",
  important: "Quan trọng",
  monetization: "Kiếm tiền",
  new: "Mới"
};

const BADGE_CLASS: Record<HelpModuleBadge, string> = {
  attention: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  important: "border-rose-400/40 bg-rose-400/10 text-rose-200",
  monetization: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  new: "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
};

type HelpGuideModuleCardProps = {
  module: StudioHelpGuideModule;
};

export function HelpGuideModuleCard({ module }: HelpGuideModuleCardProps) {
  return (
    <Card className="scroll-mt-24 space-y-4 p-4 sm:p-5" id={module.id}>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold text-white">{module.title}</h2>
          {module.badge ? (
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${BADGE_CLASS[module.badge]}`}
            >
              {BADGE_LABELS[module.badge]}
            </span>
          ) : null}
        </div>
        <p className="text-sm leading-6 text-zinc-400">{module.summary}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Khi nào dùng?</p>
          <p className="mt-1.5 text-sm leading-6 text-zinc-300">{module.whenToUse}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Bạn có thể làm gì?</p>
          <ul className="mt-1.5 space-y-1 text-sm leading-6 text-zinc-300">
            {module.capabilities.map((item) => (
              <li className="flex gap-2" key={item}>
                <span className="text-cyan-400">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ul className="space-y-4 border-t border-white/5 pt-4">
        {module.items.map((item) => (
          <li className="space-y-1.5" key={item.title}>
            <h3 className="text-sm font-semibold text-zinc-100">{item.title}</h3>
            <p className="text-sm leading-6 text-zinc-400">{item.body}</p>
            {item.links && item.links.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {item.links.map((link) => (
                  <Link
                    className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
                    href={link.href}
                    key={`${item.title}-${link.href}`}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    target={link.external ? "_blank" : undefined}
                  >
                    {link.label} →
                  </Link>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {module.primaryAction ? (
        <Link
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-300/10 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
          href={module.primaryAction.href}
        >
          {module.primaryAction.label}
        </Link>
      ) : null}
    </Card>
  );
}
