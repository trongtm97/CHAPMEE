import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  action,
  className = "",
  description,
  title
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-[1.25rem] border border-dashed border-white/12 bg-white/[0.03] px-5 py-8 text-center ${className}`}
    >
      <h2 className="text-base font-semibold text-white sm:text-lg">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-[0.95rem] leading-7 text-zinc-400">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
