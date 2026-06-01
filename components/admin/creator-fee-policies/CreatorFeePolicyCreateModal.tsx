"use client";

import { useState, useTransition } from "react";
import { CreatorFeePolicyEditor } from "@/components/admin/creator-fee-policies/CreatorFeePolicyEditor";
import { Button } from "@/components/ui";
import { searchAdminUsers, type AdminUserSearchResult } from "@/lib/admin/get-users";
import type { CreatorFeeSourceRates } from "@/types/creator-fee-policy";

type Props = {
  open: boolean;
  defaultRates: CreatorFeeSourceRates;
  preselectedCreatorId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function CreatorFeePolicyCreateModal({
  open,
  defaultRates,
  preselectedCreatorId,
  onClose,
  onSuccess
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminUserSearchResult[]>([]);
  const [selected, setSelected] = useState<AdminUserSearchResult | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  function search() {
    startTransition(async () => {
      const result = await searchAdminUsers({ query, page: 1, pageSize: 10 });
      setResults(result.users);
    });
  }

  const creatorId = selected?.id ?? preselectedCreatorId ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-10">
      <div className="w-full max-w-3xl rounded-xl border border-white/10 bg-zinc-900 p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Tạo policy mới</h3>
          <Button onClick={onClose} type="button" variant="secondary">
            Đóng
          </Button>
        </div>

        {!creatorId ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-zinc-400">Tìm tác giả để tạo chính sách phí riêng.</p>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Username, tên, user_id..."
                value={query}
              />
              <Button disabled={pending} onClick={search} type="button">
                Tìm
              </Button>
            </div>
            {results.length > 0 ? (
              <ul className="divide-y divide-white/5 rounded-lg border border-white/10">
                {results.map((user) => (
                  <li key={user.id}>
                    <button
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-white/5"
                      onClick={() => setSelected(user)}
                      type="button"
                    >
                      <span className="text-white">{user.display_name ?? user.username}</span>
                      <span className="text-zinc-500">@{user.username ?? "—"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="mt-4">
            {selected ? (
              <p className="mb-3 text-sm text-zinc-400">
                Tác giả: <span className="text-white">{selected.display_name ?? selected.username}</span>
              </p>
            ) : null}
            <CreatorFeePolicyEditor
              creatorId={creatorId}
              defaultRates={defaultRates}
              onCancel={onClose}
              onSuccess={() => {
                onSuccess();
                onClose();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
