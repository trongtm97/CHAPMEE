"use client";

import {
  buildInstructionsWithLabels,
  STUDIO_TAXONOMY_QA_CHECKLIST
} from "@/lib/studio/import-export-templates";

export function ImportGuidePanel() {
  const instructions = buildInstructionsWithLabels();

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <h2 className="text-sm font-semibold text-zinc-200">Hướng dẫn nhập / xuất</h2>
        <pre className="mt-3 max-h-[28rem] overflow-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-zinc-400">
          {instructions}
        </pre>
      </section>

      <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
        <h2 className="text-sm font-semibold text-cyan-100">Checklist QA nội bộ</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Dùng khi kiểm tra sau migration taxonomy và import/export v2.
        </p>
        <pre className="mt-3 max-h-[24rem] overflow-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-zinc-300">
          {STUDIO_TAXONOMY_QA_CHECKLIST}
        </pre>
      </section>
    </div>
  );
}
