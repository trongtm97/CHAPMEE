"use client";

import { useState } from "react";
import Link from "next/link";
import { sortByOrder, type FooterConfig } from "@/lib/settings/footer-config";

type Props = {
  config: FooterConfig;
};

export function SiteFooterMobileAccordion({ config }: Props) {
  const columns = sortByOrder(config.columns).filter((c) => c.enabled);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (columns.length === 0) return null;

  return (
    <div className="space-y-2 lg:hidden">
      {columns.map((column, index) => {
        const links = sortByOrder(column.links).filter((l) => l.enabled);
        if (links.length === 0) return null;
        const isOpen = openIndex === index;
        return (
          <div
            className="rounded-xl border border-white/10 bg-white/[0.02]"
            key={`${column.title}-${column.sortOrder}`}
          >
            <button
              className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-zinc-200"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              type="button"
            >
              {column.title}
              <span className="text-zinc-500">{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen ? (
              <ul className="space-y-1.5 border-t border-white/10 px-3 py-2">
                {links.map((link) => {
                  const ext =
                    link.external ||
                    link.href.startsWith("http://") ||
                    link.href.startsWith("https://");
                  return (
                    <li key={`${link.label}-${link.href}`}>
                      <Link
                        className="text-sm text-zinc-400 hover:text-zinc-200"
                        href={link.href}
                        rel={ext ? "noopener noreferrer" : undefined}
                        target={ext ? "_blank" : undefined}
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
