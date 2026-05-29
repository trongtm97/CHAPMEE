"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { AppSearchField } from "@/components/ui";

export function CommunitySearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    const params = new URLSearchParams(searchParams.toString());

    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }

    const next = params.toString();
    router.push(next ? `/community?${next}` : "/community");
  }

  return (
    <form className="w-full" onSubmit={handleSubmit}>
      <AppSearchField
        name="q"
        onChange={setQuery}
        inputClassName="!h-11"
        placeholder="Tìm truyện, tác giả, bài viết..."
        value={query}
        variant="pill"
      />
    </form>
  );
}
