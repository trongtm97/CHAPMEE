import type { ReactNode } from "react";

type MonetizationEmptyHintProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function MonetizationEmptyHint({ title, description, action }: MonetizationEmptyHintProps) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center">
      <p className="text-sm font-semibold text-zinc-200">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-500">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
