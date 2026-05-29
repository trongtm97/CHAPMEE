"use client";

import { Button, Input } from "@/components/ui";

type UserSearchProps = {
  query: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSearch: () => void;
};

export function UserSearch({ query, disabled, onChange, onSearch }: UserSearchProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Input
        placeholder="Tìm username, tên hiển thị hoặc user id..."
        value={query}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onSearch();
        }}
      />
      <Button disabled={disabled} onClick={onSearch} type="button">
        Tìm kiếm
      </Button>
    </div>
  );
}
