import type { ReactNode } from "react";

type LibraryEmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function LibraryEmptyState({ action, description, title }: LibraryEmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-center">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-zinc-500">{description}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
