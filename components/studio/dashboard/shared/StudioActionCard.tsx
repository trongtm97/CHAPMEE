import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";

type StudioActionCardProps = {
  title: string;
  description?: string;
  meta?: ReactNode;
  action?: ReactNode;
  href?: string;
  marker?: ReactNode;
  className?: string;
  layout?: "row" | "stack";
};

export function StudioActionCard({
  action,
  className = "",
  description,
  href,
  layout = "row",
  marker,
  meta,
  title
}: StudioActionCardProps) {
  const isStack = layout === "stack";

  const inner = (
    <Card
      className={`flex h-full flex-col gap-1.5 p-2.5 sm:gap-2 sm:p-3.5 ${
        isStack
          ? ""
          : "sm:flex-row sm:items-center sm:justify-between sm:gap-3"
      } ${className}`}
    >
      <div className={`flex min-w-0 gap-2.5 ${isStack ? "flex-col" : "items-start"}`}>
        {marker && !isStack ? <div className="mt-0.5 shrink-0">{marker}</div> : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {isStack && marker ? marker : null}
            <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">
              {title}
            </p>
            {meta}
          </div>
          {description ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-400 sm:text-sm">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {action ? (
        <div className={isStack ? "mt-auto pt-1" : "shrink-0 self-end sm:self-center"}>
          {action}
        </div>
      ) : null}
    </Card>
  );

  if (href) {
    return (
      <Link className="block transition hover:opacity-95" href={href}>
        {inner}
      </Link>
    );
  }

  return inner;
}
