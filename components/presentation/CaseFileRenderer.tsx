"use client";

import { ImageBlock } from "@/components/editor/ImageBlock";
import { PresentationReaderShell } from "@/components/presentation/PresentationReaderShell";
import type { ChapterImageMap } from "@/lib/images/get-chapter-images-map";
import { sanitizeDisplayText } from "@/lib/presentation/sanitize-display-text";
import type { CaseFileStructuredContent } from "@/types/presentation";

type CaseFileRendererProps = {
  data: CaseFileStructuredContent;
  imageMap?: ChapterImageMap;
};

export function CaseFileRenderer({ data, imageMap = {} }: CaseFileRendererProps) {
  return (
    <PresentationReaderShell>
      <div className="rounded-xl border border-zinc-600/40 bg-zinc-900/40 p-4 sm:p-5">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-amber-200/80">
          Hồ sơ hư cấu — không phải tài liệu thật
        </p>
        {data.case_title ? (
          <h2 className="mt-2 text-xl font-bold text-zinc-50">
            {sanitizeDisplayText(data.case_title)}
          </h2>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {data.case_code ? (
            <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-zinc-300">
              {sanitizeDisplayText(data.case_code)}
            </span>
          ) : null}
          {data.status ? (
            <span className="rounded-md border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-amber-100">
              {sanitizeDisplayText(data.status)}
            </span>
          ) : null}
        </div>

        <div className="mt-6 space-y-6">
          {data.sections.map((section, index) => (
            <section key={`${section.type}-${index}`}>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-zinc-300">
                {sanitizeDisplayText(section.title)}
              </h3>

              {section.type === "summary" || section.type === "note" ? (
                <p className="whitespace-pre-wrap text-[0.98em] leading-relaxed text-zinc-100/90">
                  {sanitizeDisplayText(section.content)}
                </p>
              ) : null}

              {section.type === "timeline" ? (
                <ol className="space-y-3 border-l border-zinc-600/50 pl-4">
                  {section.items.map((item, itemIndex) => (
                    <li key={itemIndex}>
                      {item.time ? (
                        <span className="mb-0.5 block text-xs font-semibold text-cyan-200/90">
                          {sanitizeDisplayText(item.time)}
                        </span>
                      ) : null}
                      <p className="whitespace-pre-wrap text-[0.98em] text-zinc-100/90">
                        {sanitizeDisplayText(item.content)}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : null}

              {section.type === "evidence" ? (
                <ul className="space-y-2">
                  {section.items.map((item, itemIndex) => (
                    <li
                      className="rounded-lg border border-zinc-700/60 bg-zinc-950/50 px-3 py-2"
                      key={itemIndex}
                    >
                      <p className="text-xs font-semibold text-zinc-400">
                        {sanitizeDisplayText(item.label)}
                      </p>
                      {item.media_id && imageMap[item.media_id] ? (
                        <div className="mt-2">
                          <ImageBlock block={imageMap[item.media_id]} />
                        </div>
                      ) : null}
                      {item.content.trim() ? (
                        <p className="mt-1 whitespace-pre-wrap text-[0.98em] text-zinc-100/90">
                          {sanitizeDisplayText(item.content)}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </div>
    </PresentationReaderShell>
  );
}
