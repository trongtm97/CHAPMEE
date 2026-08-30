"use client";

import type { ReactNode } from "react";

export const utilityActionSecondaryClassName =
  "rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm font-semibold text-zinc-100 transition hover:border-white/20 sm:px-4";

export const utilityActionPrimaryClassName =
  "ml-auto min-w-[7.5rem] flex-1 basis-36 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-50";

type UtilityAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
};

type UtilityActionBarProps = {
  primary: UtilityAction;
  children?: ReactNode;
};

export function UtilityActionBar({ primary, children }: UtilityActionBarProps) {
  return (
    <div className="flex flex-wrap items-stretch gap-2">
      {children}
      <button
        className={`${utilityActionPrimaryClassName} ${primary.className ?? ""}`}
        disabled={primary.disabled}
        onClick={primary.onClick}
        type="button"
      >
        {primary.label}
      </button>
    </div>
  );
}

export function UtilityActionSecondaryButton({
  label,
  onClick,
  disabled,
  className
}: UtilityAction) {
  return (
    <button
      className={`${utilityActionSecondaryClassName} ${className ?? ""}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
