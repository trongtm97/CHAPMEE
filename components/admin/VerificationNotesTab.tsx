"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { createVerificationNoteAction } from "@/lib/admin/create-verification-note";
import {
  VERIFICATION_NOTE_TAG_LABELS,
  type VerificationNote,
  type VerificationNoteTag
} from "@/types/admin-verification";

type Props = {
  verificationId: string;
  notes: VerificationNote[];
  onAdded: () => void;
};

export function VerificationNotesTab({ verificationId, notes, onAdded }: Props) {
  const [note, setNote] = useState("");
  const [tag, setTag] = useState<VerificationNoteTag>("normal");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await createVerificationNoteAction({
        verificationId,
        note,
        tag
      });
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setNote("");
      setMessage(null);
      onAdded();
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border border-white/10 p-3">
        <textarea
          className="min-h-20 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ghi chú nội bộ (không hiển thị cho user)..."
          value={note}
        />
        <select
          className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
          onChange={(e) => setTag(e.target.value as VerificationNoteTag)}
          value={tag}
        >
          {(Object.keys(VERIFICATION_NOTE_TAG_LABELS) as VerificationNoteTag[]).map((key) => (
            <option key={key} value={key}>
              {VERIFICATION_NOTE_TAG_LABELS[key]}
            </option>
          ))}
        </select>
        {message ? <p className="text-sm text-red-300">{message}</p> : null}
        <Button disabled={isPending} onClick={submit} type="button">
          Thêm ghi chú
        </Button>
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-zinc-400">Chưa có ghi chú.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((item) => (
            <li className="rounded-lg bg-white/[0.03] p-3 text-sm" key={item.id}>
              <p className="text-zinc-200">{item.note}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {item.adminName ?? "Admin"} ·{" "}
                {new Date(item.createdAt).toLocaleString("vi-VN")}
                {item.tag ? ` · ${VERIFICATION_NOTE_TAG_LABELS[item.tag]}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
