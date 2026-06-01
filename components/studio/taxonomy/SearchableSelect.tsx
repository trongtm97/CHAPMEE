"use client";

import { useMemo, useState, type ReactNode } from "react";

export type SearchableSelectOption = {
  value: string;
  label: string;
  description?: string | null;
  featured?: boolean;
};

type SearchableSelectProps = {
  disabled?: boolean;
  emptyMessage?: string;
  inputName?: string;
  label: ReactNode;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  required?: boolean;
  value: string;
};

export function SearchableSelect({
  disabled = false,
  emptyMessage = "Không có mục phù hợp.",
  inputName,
  label,
  onChange,
  options,
  placeholder = "Tìm hoặc chọn…",
  required = false,
  value
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((option) => option.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = !q
      ? options
      : options.filter((option) =>
          `${option.label} ${option.description ?? ""}`.toLowerCase().includes(q)
        );
    const featured = list.filter((option) => option.featured);
    const rest = list.filter((option) => !option.featured);
    return featured.length ? [...featured, ...rest] : list;
  }, [options, query]);

  return (
    <div className="space-y-2">
      <span className="block text-sm font-bold text-zinc-200">{label}</span>
      {inputName ? (
        <input name={inputName} type="hidden" value={value} />
      ) : null}
      {selected && !open ? (
        <div className="flex items-start justify-between gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/[0.06] px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">{selected.label}</p>
            {selected.description ? (
              <p className="mt-0.5 text-xs text-zinc-500">{selected.description}</p>
            ) : null}
          </div>
          <button
            className="shrink-0 text-xs font-semibold text-cyan-300 hover:text-cyan-200 disabled:opacity-50"
            disabled={disabled}
            onClick={() => setOpen(true)}
            type="button"
          >
            Đổi
          </button>
        </div>
      ) : (
        <div className="space-y-2 rounded-xl border border-white/10 bg-zinc-950/50 p-2">
          <input
            className="min-h-10 w-full rounded-lg border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300 disabled:opacity-60"
            disabled={disabled}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            type="search"
            value={query}
          />
          <ul className="max-h-44 space-y-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-2 py-2 text-xs text-zinc-500">{emptyMessage}</li>
            ) : (
              filtered.map((option) => {
                const active = option.value === value;
                return (
                  <li key={option.value}>
                    <button
                      className={`w-full rounded-lg px-2.5 py-2 text-left text-sm transition ${
                        active
                          ? "bg-cyan-400/15 text-cyan-100"
                          : "text-zinc-200 hover:bg-white/5"
                      }`}
                      disabled={disabled}
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                        setQuery("");
                      }}
                      type="button"
                    >
                      <span className="font-medium">
                        {option.label}
                        {option.featured ? (
                          <span className="ml-1 text-[10px] text-cyan-300">★</span>
                        ) : null}
                      </span>
                      {option.description ? (
                        <span className="mt-0.5 block text-xs text-zinc-500">
                          {option.description}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
          {selected ? (
            <button
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-300"
              disabled={disabled}
              onClick={() => {
                setOpen(false);
                setQuery("");
              }}
              type="button"
            >
              Đóng
            </button>
          ) : null}
        </div>
      )}
      {required && !value ? (
        <p className="text-xs text-zinc-600">Bắt buộc trước khi gửi duyệt.</p>
      ) : null}
    </div>
  );
}
