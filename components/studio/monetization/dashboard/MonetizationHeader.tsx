import Link from "next/link";
import { Button } from "@/components/ui";
import { StatusBadge } from "@/components/studio/monetization/dashboard/StatusBadge";
import type { MonetizationHeaderCta, MonetizationProgramBadge } from "@/types/studio-monetization-dashboard";

type MonetizationHeaderProps = {
  badge: MonetizationProgramBadge;
  ctas: MonetizationHeaderCta[];
};

export function MonetizationHeader({ badge, ctas }: MonetizationHeaderProps) {
  return (
    <header className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-950 via-zinc-950 to-cyan-950/20 p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300/80">
            Studio · Kiếm tiền
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Kiếm tiền</h1>
            <StatusBadge badge={badge} />
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
            Quản lý doanh thu, trả phí, quảng cáo và rút tiền.
          </p>
          {badge.description ? (
            <p className="text-xs text-zinc-500">{badge.description}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
          {ctas.map((cta) => (
            <Link
              className="w-full sm:w-auto"
              href={cta.href}
              key={`${cta.label}-${cta.href}`}
              title={cta.title}
            >
              <Button
                className="!min-h-11 w-full !normal-case sm:w-auto"
                disabled={cta.disabled}
                type="button"
                variant={
                  cta.variant === "primary"
                    ? "primary"
                    : cta.variant === "secondary"
                      ? "secondary"
                      : "ghost"
                }
              >
                {cta.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
