"use client";

import { useState } from "react";
import { AppSearchField } from "@/components/ui/AppSearchField";

type ChapterSearchJumpProps = {
  onSearch: (query: string) => void;
  loading?: boolean;
};

export function ChapterSearchJump({ loading, onSearch }: ChapterSearchJumpProps) {
  const [value, setValue] = useState("");

  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(value.trim());
      }}
    >
      <AppSearchField
        onChange={setValue}
        placeholder="Tìm chương hoặc nhập số chương..."
        showSubmit={false}
        value={value}
        variant="field"
      />
      <button
        className="text-xs font-semibold text-cyan-200 disabled:opacity-50"
        disabled={loading || !value.trim()}
        type="submit"
      >
        Tìm chương
      </button>
    </form>
  );
}
