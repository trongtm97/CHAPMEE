"use client";

import { Button } from "@/components/ui";

type HelpSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  resultCount?: number;
};

export function HelpSearchBar({ onChange, onClear, resultCount, value }: HelpSearchBarProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-zinc-200" htmlFor="help-search">
        Tìm kiếm hỗ trợ
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className="min-h-11 flex-1 rounded-xl border border-white/10 bg-zinc-950 px-4 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          id="help-search"
          onChange={(event) => onChange(event.target.value)}
          placeholder="Tìm câu hỏi, ví dụ: nhập truyện, rút tiền, Reels, lịch đăng..."
          type="search"
          value={value}
        />
        {value ? (
          <Button className="min-h-11 shrink-0" onClick={onClear} type="button" variant="secondary">
            Xóa tìm kiếm
          </Button>
        ) : null}
      </div>
      {value && resultCount !== undefined ? (
        <p className="text-xs text-zinc-500">
          {resultCount > 0 ? `Tìm thấy ${resultCount} kết quả liên quan.` : "Không có kết quả khớp."}
        </p>
      ) : null}
    </div>
  );
}
