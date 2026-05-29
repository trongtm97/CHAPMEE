"use client";

import { useState, useTransition } from "react";
import { Button, Input, Textarea } from "@/components/ui";
import { createTemplateAction } from "@/lib/studio/template-actions";
import { STUDIO_TEMPLATE_TYPE_OPTIONS } from "@/lib/studio/template-labels";
import type { StudioTemplateType } from "@/types/templates";
import { STUDIO_TEMPLATE_TITLE_MAX } from "@/types/templates";

type SaveAsTemplateDialogProps = {
  body: string;
  defaultTemplateType?: StudioTemplateType;
  onClose: () => void;
  onSaved?: (templateId: string) => void;
  open: boolean;
};

export function SaveAsTemplateDialog({
  body,
  defaultTemplateType = "chapter",
  onClose,
  onSaved,
  open
}: SaveAsTemplateDialogProps) {
  const [title, setTitle] = useState("");
  const [templateType, setTemplateType] = useState<StudioTemplateType>(defaultTemplateType);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return null;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createTemplateAction({
        body,
        description,
        templateType,
        title
      });

      if (!result.ok) {
        setError(result.error ?? "Không thể lưu mẫu.");
        return;
      }

      if (result.id) {
        onSaved?.(result.id);
      }

      setTitle("");
      setDescription("");
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="dialog"
    >
      <form
        className="w-full max-w-md rounded-t-2xl border border-white/10 bg-zinc-950 p-4 sm:rounded-2xl"
        onSubmit={handleSubmit}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Lưu thành mẫu</h2>
          <button
            className="text-sm text-zinc-400 hover:text-zinc-200"
            onClick={onClose}
            type="button"
          >
            Đóng
          </button>
        </div>

        <div className="space-y-3">
          <Input
            disabled={isPending}
            label="Tên mẫu"
            maxLength={STUDIO_TEMPLATE_TITLE_MAX}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="VD: Mở đầu chương kiểu recap"
            required
            value={title}
          />

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-300">Loại mẫu</span>
            <select
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100"
              disabled={isPending}
              onChange={(event) =>
                setTemplateType(event.target.value as StudioTemplateType)
              }
              value={templateType}
            >
              {STUDIO_TEMPLATE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <Textarea
            disabled={isPending}
            label="Mô tả"
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Tuỳ chọn — ghi chú khi nào dùng mẫu này"
            rows={2}
            value={description}
          />

          <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-zinc-400">
            Lưu {body.trim().length.toLocaleString("vi-VN")} ký tự từ nội dung hiện tại.
          </p>

          {error ? (
            <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-100">
              {error}
            </p>
          ) : null}

          <Button disabled={isPending || !body.trim()} loading={isPending} type="submit">
            Lưu thành mẫu
          </Button>
        </div>
      </form>
    </div>
  );
}
