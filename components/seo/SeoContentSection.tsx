"use client";

import type { ResolvedSeoContentBlock } from "@/lib/seo/seo-content-service";
import { renderSeoMarkdownToSafeHtml, sanitizeSeoLinkUrl } from "@/lib/seo/markdown-sanitize";

type SeoContentSectionProps = {
  block: ResolvedSeoContentBlock;
};

function FaqAccordion({ block }: { block: ResolvedSeoContentBlock }) {
  if (block.faq.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold text-zinc-200">Câu hỏi thường gặp</h3>
      <div className="space-y-2">
        {block.faq.map((item, index) => (
          <details
            className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-2"
            key={`${item.question}-${index}`}
          >
            <summary className="cursor-pointer text-sm font-semibold text-zinc-100">
              {item.question}
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

function InternalLinksList({ block }: { block: ResolvedSeoContentBlock }) {
  if (block.internalLinks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold text-zinc-200">Liên kết hữu ích</h3>
      <ul className="space-y-2 text-sm">
        {block.internalLinks.map((link, index) => {
          const href = sanitizeSeoLinkUrl(link.url);
          if (!href) {
            return null;
          }
          return (
            <li key={`${link.label}-${index}`}>
              <a className="font-semibold text-cyan-300 hover:text-cyan-200" href={href}>
                {link.label}
              </a>
              {link.note ? <span className="ml-2 text-zinc-500">— {link.note}</span> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SeoContentBody({ block }: { block: ResolvedSeoContentBlock }) {
  const html = renderSeoMarkdownToSafeHtml(block.contentMarkdown);

  return (
    <div className="space-y-4">
      {block.summary ? (
        <p className="text-sm leading-relaxed text-zinc-400 md:text-base">{block.summary}</p>
      ) : null}

      <div
        className="seo-content-markdown space-y-3 text-sm leading-relaxed text-zinc-300 md:text-base [&_a]:text-cyan-300 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-600 [&_blockquote]:pl-3 [&_code]:rounded [&_code]:bg-zinc-800 [&_code]:px-1 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-zinc-100 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-zinc-100 [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-zinc-200 [&_li]:ml-4 [&_ol]:list-decimal [&_ul]:list-disc"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <FaqAccordion block={block} />
      <InternalLinksList block={block} />
    </div>
  );
}

export function SeoContentSection({ block }: SeoContentSectionProps) {
  const collapsibleMobile = block.isCollapsible;

  return (
    <section
      aria-labelledby={`seo-content-${block.id}`}
      className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6"
    >
      {collapsibleMobile ? (
        <>
          <details className="group rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 md:hidden">
            <summary className="cursor-pointer list-none text-base font-semibold text-zinc-100 [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden className="text-cyan-300/80">
                  ▾
                </span>
                {block.title}
              </span>
            </summary>
            <div className="mt-4 border-t border-white/[0.06] pt-4">
              <SeoContentBody block={block} />
            </div>
          </details>

          <div className="hidden space-y-4 md:block">
            <h2 className="text-xl font-bold text-zinc-100" id={`seo-content-${block.id}`}>
              {block.title}
            </h2>
            <SeoContentBody block={block} />
          </div>
        </>
      ) : (
        <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 md:p-6">
          <h2 className="text-xl font-bold text-zinc-100" id={`seo-content-${block.id}`}>
            {block.title}
          </h2>
          <SeoContentBody block={block} />
        </div>
      )}
    </section>
  );
}
