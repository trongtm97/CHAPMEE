"use client";

import { useEffect, useState, useTransition } from "react";
import { ConfirmActionModal } from "@/components/admin/campaigns/ConfirmActionModal";
import { Button } from "@/components/ui";
import {
  listTaxonomyTermsAdminAction,
  mergeTaxonomyTermsAdminAction
} from "@/lib/admin/taxonomy-actions";
import { TAXONOMY_TYPE_LABELS } from "@/lib/taxonomy/constants";
import type { TaxonomyTermAdminRow } from "@/lib/taxonomy/admin-data";
import type { TaxonomyAdminNotify } from "@/lib/taxonomy/admin-ui";

type TaxonomyMergeModalProps = {
  source: TaxonomyTermAdminRow | null;
  open: boolean;
  onClose: () => void;
  onMerged: () => void;
  onMessage: TaxonomyAdminNotify;
};

export function TaxonomyMergeModal({
  source,
  open,
  onClose,
  onMerged,
  onMessage
}: TaxonomyMergeModalProps) {
  const [pending, startTransition] = useTransition();
  const [targetId, setTargetId] = useState("");
  const [options, setOptions] = useState<TaxonomyTermAdminRow[]>([]);
  const [confirmMerge, setConfirmMerge] = useState(false);

  useEffect(() => {
    if (!open || !source) return;
    setTargetId("");
    setConfirmMerge(false);
    startTransition(async () => {
      const result = await listTaxonomyTermsAdminAction({
        type: source.type,
        page: 1,
        pageSize: 200,
        activeOnly: true
      });
      setOptions(result.items.filter((row) => row.id !== source.id));
    });
  }, [open, source?.id, source?.type]);

  if (!open || !source) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-xl border border-zinc-700 bg-[#0c1118] p-5 shadow-2xl">
        <h2 className="text-lg font-semibold text-white">Gộp taxonomy</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Gộp <strong className="text-zinc-200">{source.name}</strong> ({source.usage_count} truyện)
          vào nhãn đích cùng nhóm {TAXONOMY_TYPE_LABELS[source.type]}. Nhãn nguồn sẽ bị tắt sau khi
          gộp.
        </p>

        <label className="mt-4 block space-y-1 text-sm">
          <span className="text-zinc-400">Nhãn đích</span>
          <select
            className="min-h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-white"
            onChange={(e) => setTargetId(e.target.value)}
            value={targetId}
          >
            <option value="">— Chọn nhãn —</option>
            {options.map((term) => (
              <option key={term.id} value={term.id}>
                {term.name} ({term.slug}) · {term.usage_count} usage
              </option>
            ))}
          </select>
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={onClose} type="button" variant="secondary">
            Hủy
          </Button>
          <Button
            disabled={!targetId}
            onClick={() => setConfirmMerge(true)}
            type="button"
          >
            Gộp
          </Button>
        </div>
      </div>

      <ConfirmActionModal
        confirmLabel="Gộp"
        description={`Gộp "${source.name}" vào nhãn đích? ${source.usage_count} liên kết truyện sẽ chuyển sang nhãn đích; nhãn nguồn sẽ bị tắt.`}
        onClose={() => setConfirmMerge(false)}
        onConfirm={() => {
          setConfirmMerge(false);
          startTransition(async () => {
            const result = await mergeTaxonomyTermsAdminAction(source.id, targetId);
            if (result.error || !result.ok) {
              onMessage(result.error ?? "Gộp thất bại.");
              return;
            }
            onMessage("Đã gộp taxonomy.", "success");
            onMerged();
            onClose();
          });
        }}
        open={confirmMerge}
        pending={pending}
        title="Xác nhận gộp taxonomy"
        variant="danger"
      />
    </div>
  );
}
