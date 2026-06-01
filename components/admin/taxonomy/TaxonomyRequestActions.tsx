"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import {
  approveTaxonomyRequestAdminAction,
  listTaxonomyTermsAdminAction,
  mergeTaxonomyRequestAdminAction,
  rejectTaxonomyRequestAdminAction
} from "@/lib/admin/taxonomy-actions";
import type { TaxonomyRequestAdminRow } from "@/lib/taxonomy/admin-data";
import type { TaxonomyAdminNotify } from "@/lib/taxonomy/admin-ui";
import type { TaxonomyTerm } from "@/types/taxonomy";

type TaxonomyRequestActionsProps = {
  request: TaxonomyRequestAdminRow;
  onUpdated: () => void;
  onMessage: TaxonomyAdminNotify;
  compact?: boolean;
};

export function TaxonomyRequestActions({
  request,
  onUpdated,
  onMessage,
  compact = false
}: TaxonomyRequestActionsProps) {
  const [pending, startTransition] = useTransition();
  const [mergeTermId, setMergeTermId] = useState(
    request.related_existing_term_id ?? ""
  );
  const [mergeOptions, setMergeOptions] = useState<TaxonomyTerm[]>([]);
  const [adminNote, setAdminNote] = useState("");
  const [addAlias, setAddAlias] = useState(true);

  const isPending = request.status === "pending";

  useEffect(() => {
    if (!isPending) return;
    startTransition(async () => {
      const result = await listTaxonomyTermsAdminAction({
        type: request.type,
        page: 1,
        pageSize: 200
      });
      setMergeOptions(result.items);
    });
  }, [request.type, isPending]);

  if (!isPending) {
    return request.admin_note ? (
      <p className="text-xs text-zinc-500">Ghi chú: {request.admin_note}</p>
    ) : null;
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <select
        className="min-h-9 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm text-white"
        onChange={(e) => setMergeTermId(e.target.value)}
        value={mergeTermId}
      >
        <option value="">Gộp vào nhãn có sẵn…</option>
        {mergeOptions.map((term) => (
          <option key={term.id} value={term.id}>
            {term.name} ({term.slug})
          </option>
        ))}
      </select>
      <textarea
        className="min-h-14 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-white"
        onChange={(e) => setAdminNote(e.target.value)}
        placeholder="Ghi chú admin (bắt buộc khi từ chối)"
        value={adminNote}
      />
      <label className="flex items-center gap-2 text-xs text-zinc-400">
        <input
          checked={addAlias}
          onChange={(e) => setAddAlias(e.target.checked)}
          type="checkbox"
        />
        Thêm tên đề xuất vào aliases khi gộp
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await approveTaxonomyRequestAdminAction(
                request.id,
                adminNote.trim() || null
              );
              if (result.error) {
                onMessage(result.error);
                return;
              }
              onMessage("Đã duyệt yêu cầu.", "success");
              onUpdated();
            })
          }
          type="button"
        >
          Duyệt
        </Button>
        <Button
          loading={pending}
          onClick={() => {
            if (!adminNote.trim()) {
              onMessage("Cần ghi chú admin khi từ chối.");
              return;
            }
            startTransition(async () => {
              const result = await rejectTaxonomyRequestAdminAction(
                request.id,
                adminNote.trim()
              );
              if (result.error) {
                onMessage(result.error);
                return;
              }
              onMessage("Đã từ chối yêu cầu.", "success");
              onUpdated();
            });
          }}
          type="button"
          variant="secondary"
        >
          Từ chối
        </Button>
        <Button
          disabled={!mergeTermId}
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await mergeTaxonomyRequestAdminAction(
                request.id,
                mergeTermId,
                adminNote.trim() || null,
                addAlias
              );
              if (result.error) {
                onMessage(result.error);
                return;
              }
              onMessage("Đã gộp yêu cầu vào nhãn có sẵn.", "success");
              onUpdated();
            })
          }
          type="button"
          variant="secondary"
        >
          Gộp
        </Button>
      </div>
    </div>
  );
}
