"use client";

import { Button, Input, Textarea } from "@/components/ui";
import type { ReactNode } from "react";

export function ComposerFieldGroup({
  children,
  title
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-white/10 bg-zinc-950/40 p-3">
      <legend className="px-1 text-xs font-bold uppercase tracking-wide text-zinc-400">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

export function ComposerTextarea({
  disabled,
  label,
  onChange,
  placeholder,
  rows = 4,
  value
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  value: string;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-semibold text-zinc-200">{label}</span>
      <textarea
        className="min-h-[5rem] w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        value={value}
      />
    </label>
  );
}

export function ComposerSelect({
  disabled,
  label,
  onChange,
  options,
  value
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  value: string;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-semibold text-zinc-200">{label}</span>
      <select
        className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100"
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        value={value}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

type ArrayEditorProps<T> = {
  disabled?: boolean;
  items: T[];
  label: string;
  onChange: (items: T[]) => void;
  createItem: () => T;
  renderItem: (
    item: T,
    index: number,
    update: (patch: Partial<T>) => void
  ) => ReactNode;
};

export function ComposerArrayEditor<T extends Record<string, unknown>>({
  createItem,
  disabled,
  items,
  label,
  onChange,
  renderItem
}: ArrayEditorProps<T>) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-200">{label}</p>
        <Button
          disabled={disabled}
          onClick={() => onChange([...items, createItem()])}
          type="button"
          variant="secondary"
        >
          + Thêm dòng
        </Button>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-2"
            key={index}
          >
            {renderItem(item, index, (patch) => {
              const next = [...items];
              next[index] = { ...next[index], ...patch };
              onChange(next);
            })}
            <Button
              disabled={disabled}
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              type="button"
              variant="ghost"
            >
              Xóa dòng
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
