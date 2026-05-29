"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui";
import type { StudioHelpFaqItem } from "@/lib/content/studio-help";

type FAQAccordionProps = {
  items: StudioHelpFaqItem[];
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

export function FAQAccordion({ items }: FAQAccordionProps) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());

    if (!q) {
      return items;
    }

    return items.filter((item) => {
      const haystack = normalize(
        [item.question, item.answer, ...item.keywords].join(" ")
      );
      return haystack.includes(q);
    });
  }, [items, query]);

  return (
    <section className="space-y-4" id="faq">
      <div>
        <h2 className="text-lg font-bold text-white">Câu hỏi thường gặp</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Gõ từ khóa để lọc nhanh (ví dụ: rút tiền, import, Swipe).
        </p>
      </div>

      <Input
        aria-label="Tìm trong FAQ"
        name="faq_search"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Tìm câu hỏi…"
        value={query}
      />

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-400">
          Không có câu hỏi khớp. Thử từ khóa khác hoặc liên hệ ChapMee bên dưới.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const open = openId === item.id;

            return (
              <div
                className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
                key={item.id}
              >
                <button
                  aria-expanded={open}
                  className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-white hover:bg-white/[0.04]"
                  onClick={() => setOpenId(open ? null : item.id)}
                  type="button"
                >
                  <span>{item.question}</span>
                  <span aria-hidden className="shrink-0 text-zinc-500">
                    {open ? "−" : "+"}
                  </span>
                </button>
                {open ? (
                  <div className="border-t border-white/10 px-4 py-3 text-sm leading-6 text-zinc-300">
                    {item.answer}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
