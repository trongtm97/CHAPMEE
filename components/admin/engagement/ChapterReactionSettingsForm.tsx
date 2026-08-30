"use client";

import { useActionState } from "react";
import { updateChapterReactionTypeAction } from "@/lib/admin/chapter-reaction-settings-actions";
import type { AdminReactionTypeRow } from "@/lib/admin/chapter-reaction-settings-actions";

type ChapterReactionSettingsFormProps = {
  types: AdminReactionTypeRow[];
};

export function ChapterReactionSettingsForm({ types }: ChapterReactionSettingsFormProps) {
  if (types.length === 0) {
    return (
      <p className="rounded-2xl border border-white/[0.08] px-4 py-8 text-center text-sm text-zinc-500">
        Chưa có loại cảm xúc trong catalog.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-white/[0.08] bg-white/[0.02] text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-3 py-2.5">Emoji</th>
            <th className="px-3 py-2.5">Key</th>
            <th className="px-3 py-2.5">Nhãn</th>
            <th className="px-3 py-2.5">Bật</th>
            <th className="px-3 py-2.5">Thứ tự</th>
            <th className="px-3 py-2.5">Cập nhật</th>
            <th className="px-3 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {types.map((type) => (
            <ReactionTypeRow key={type.key} type={type} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReactionTypeRow({ type }: { type: AdminReactionTypeRow }) {
  const [state, action, pending] = useActionState(
    async (_prev: { ok: boolean; message: string } | null, formData: FormData) => {
      return updateChapterReactionTypeAction(formData);
    },
    null
  );

  return (
    <tr className="text-zinc-300">
      <td className="px-3 py-3" colSpan={7}>
        <form action={action} className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] items-center gap-3">
          <input name="key" type="hidden" value={type.key} />
          <input
            className="w-16 rounded-lg border border-white/[0.08] bg-[#0b1016] px-2 py-1 text-lg"
            defaultValue={type.emoji}
            maxLength={8}
            name="emoji"
            required
          />
          <span className="font-mono text-xs text-zinc-400">{type.key}</span>
          <input
            className="min-w-[8rem] rounded-lg border border-white/[0.08] bg-[#0b1016] px-2 py-1 text-sm"
            defaultValue={type.label}
            maxLength={80}
            name="label"
            required
          />
          <label className="flex items-center gap-1 text-xs">
            <input defaultChecked={type.isEnabled} name="isEnabled" type="checkbox" />
            Bật
          </label>
          <input
            className="w-16 rounded-lg border border-white/[0.08] bg-[#0b1016] px-2 py-1 text-sm"
            defaultValue={type.sortOrder}
            name="sortOrder"
            required
            type="number"
          />
          <span className="text-xs text-zinc-500">
            {type.updatedAt ? new Date(type.updatedAt).toLocaleString("vi-VN") : "—"}
          </span>
          <button
            className="rounded-full bg-cyan-300 px-3 py-1.5 text-xs font-bold text-zinc-950 disabled:opacity-60"
            disabled={pending}
            type="submit"
          >
            {pending ? "…" : "Lưu"}
          </button>
          {state?.message ? (
            <p className={`col-span-full text-xs ${state.ok ? "text-emerald-400" : "text-rose-400"}`}>
              {state.message}
            </p>
          ) : null}
        </form>
      </td>
    </tr>
  );
}
