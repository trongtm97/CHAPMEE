import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui";

type HomeEmptyStateProps = {
  title?: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: ReactNode;
  className?: string;
};

export function HomeEmptyState({
  actionHref,
  actionLabel,
  className = "",
  description,
  icon,
  title
}: HomeEmptyStateProps) {
  return (
    <Card
      className={`border-white/8 bg-white/[0.035] p-4 shadow-[0_12px_26px_rgba(0,0,0,0.18)] ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-300/15 bg-cyan-300/10 text-cyan-200">
          {icon ?? (
            <span
              aria-hidden="true"
              className="block h-2.5 w-2.5 rounded-full bg-current"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {title ? (
            <h3 className="text-[1rem] font-bold leading-6 text-white">
              {title}
            </h3>
          ) : null}
          <p
            className={`text-[0.95rem] leading-7 text-zinc-400 ${title ? "mt-1" : ""}`}
          >
            {description}
          </p>
          {actionHref && actionLabel ? (
            <Link
              className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-4 text-[0.95rem] font-bold text-zinc-100 transition hover:border-cyan-300/25 hover:bg-cyan-300/10 hover:text-cyan-100"
              href={actionHref}
            >
              {actionLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
