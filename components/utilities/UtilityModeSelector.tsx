"use client";

import { useId } from "react";

export type UtilityModeOption<T extends string> = {
  value: T;
  label: string;
};

type UtilityModeSelectorProps<T extends string> = {
  value: T;
  options: readonly UtilityModeOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
};

const selectClassName =
  "w-full rounded-2xl border border-white/15 bg-zinc-900/90 px-4 py-3 text-sm text-zinc-100 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-50";

function tabClassName(active: boolean, disabled?: boolean) {
  return `rounded-xl border px-3 py-2 text-sm font-semibold transition ${
    active
      ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
      : "border-white/10 bg-zinc-900/80 text-zinc-300 hover:border-white/20"
  } ${disabled ? "cursor-not-allowed opacity-50" : ""}`;
}

export function UtilityModeSelector<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  disabled,
  className
}: UtilityModeSelectorProps<T>) {
  const selectId = useId();

  return (
    <div className={className}>
      <div className="md:hidden">
        <label className="sr-only" htmlFor={selectId}>
          {ariaLabel}
        </label>
        <select
          aria-label={ariaLabel}
          className={selectClassName}
          disabled={disabled}
          id={selectId}
          onChange={(event) => onChange(event.target.value as T)}
          value={value}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div aria-label={ariaLabel} className="hidden flex-wrap gap-2 md:flex" role="tablist">
        {options.map((option) => (
          <button
            aria-selected={value === option.value}
            className={tabClassName(value === option.value, disabled)}
            disabled={disabled}
            key={option.value}
            onClick={() => onChange(option.value)}
            role="tab"
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
