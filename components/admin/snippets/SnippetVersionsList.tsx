"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { rollbackSnippetAction } from "@/lib/admin/snippet-actions";
import type { CodeSnippetVersionRow } from "@/lib/db/schema/code-snippets";

type SnippetVersionsListProps = {
  snippetId: string;
  versions: CodeSnippetVersionRow[];
  currentCode: string;
  canRollback: boolean;
};

export function SnippetVersionsList({
  snippetId,
  versions,
  currentCode,
  canRollback
}: SnippetVersionsListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!versions.length) {
    return <p className="text-sm text-zinc-500">Chưa có phiên bản.</p>;
  }

  return (
    <div className="space-y-3">
      {versions.map((v) => {
        const changed = v.code !== currentCode;
        return (
          <div
            className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm"
            key={v.id}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-zinc-200">
                v{v.versionNumber}
                {v.changeNote ? (
                  <span className="ml-2 font-normal text-zinc-500">— {v.changeNote}</span>
                ) : null}
              </p>
              <p className="text-xs text-zinc-500">
                {new Date(v.createdAt).toLocaleString("vi-VN")}
              </p>
            </div>
            <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-black/40 p-2 font-mono text-xs text-zinc-400">
              {v.code.slice(0, 500)}
              {v.code.length > 500 ? "…" : ""}
            </pre>
            {canRollback && changed ? (
              <button
                className="mt-2 rounded-full border border-cyan-300/40 px-3 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-50"
                disabled={pending}
                onClick={() => {
                  if (!confirm(`Khôi phục phiên bản v${v.versionNumber}? Snippet sẽ chuyển inactive.`)) {
                    return;
                  }
                  startTransition(async () => {
                    await rollbackSnippetAction(snippetId, v.id, `Rollback v${v.versionNumber}`);
                    router.push(`/admin/developer/snippets/${snippetId}`);
                  });
                }}
                type="button"
              >
                Khôi phục phiên bản
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
