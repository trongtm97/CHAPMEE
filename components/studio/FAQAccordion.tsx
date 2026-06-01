"use client";

import { useMemo, useState } from "react";
import type { StudioHelpFaqItem } from "@/lib/content/studio-help";
import { filterFaqItems } from "@/lib/content/studio-help";

type FAQAccordionProps = {
  items: StudioHelpFaqItem[];
  /** Khi có, dùng search toàn trang thay vì ô tìm riêng */
  externalQuery?: string;
};

export function FAQAccordion({ externalQuery, items }: FAQAccordionProps) {
  const [internalQuery, setInternalQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  const query = externalQuery !== undefined ? externalQuery : internalQuery;

  const filtered = useMemo(() => filterFaqItems(items, query), [items, query]);

  return (
    <section className="scroll-mt-24 space-y-4" id="faq">
      <div>
        <h2 className="text-lg font-bold text-white">Câu hỏi thường gặp</h2>
        <p className="mt-1 text-sm text-zinc-400">
          {externalQuery !== undefined
            ? "Kết quả được lọc theo tìm kiếm ở đầu trang."
            : "Gõ từ khóa để lọc nhanh (ví dụ: rút tiền, nhập, Reels)."}
        </p>
      </div>

      {externalQuery === undefined ? (
        <input
          aria-label="Tìm trong FAQ"
          className="min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          name="faq_search"
          onChange={(event) => setInternalQuery(event.target.value)}
          placeholder="Tìm câu hỏi…"
          type="search"
          value={internalQuery}
        />
      ) : null}

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
                  className="flex w-full min-h-11 items-start justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-white hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cyan-300"
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
