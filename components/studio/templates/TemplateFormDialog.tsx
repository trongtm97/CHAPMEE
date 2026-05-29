"use client";

import { useEffect, useState, useTransition } from "react";
import { Button, Input, Textarea } from "@/components/ui";
import {
  createTemplateAction,
  updateTemplateAction
} from "@/lib/studio/template-actions";
import { getTemplateBody } from "@/lib/studio/template-content";
import { STUDIO_TEMPLATE_TYPE_OPTIONS } from "@/lib/studio/template-labels";
import type { StudioTemplateRecord, StudioTemplateType } from "@/types/templates";
import { STUDIO_TEMPLATE_TITLE_MAX } from "@/types/templates";

type TemplateFormDialogProps = {
  mode: "create" | "edit";
  onClose: () => void;
  onSuccess: () => void;
  open: boolean;
  template?: StudioTemplateRecord | null;
};

export function TemplateFormDialog({
  mode,
  onClose,
  onSuccess,
  open,
  template
}: TemplateFormDialogProps) {
  const [title, setTitle] = useState("");
  const [templateType, setTemplateType] = useState<StudioTemplateType>("chapter");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && template) {
      setTitle(template.title);
      setTemplateType(template.templateType);
      setDescription(template.description ?? "");
      setBody(getTemplateBody(template.content));
    } else {
      setTitle("");
      setTemplateType("chapter");
      setDescription("");
      setBody("");
    }

    setError(null);
  }, [mode, open, template]);

  if (!open) {
    return null;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const payload = {
        body,
        description,
        templateType,
        title
      };

      const result =
        mode === "edit" && template
          ? await updateTemplateAction({ id: template.id, ...payload })
          : await createTemplateAction(payload);

      if (!result.ok) {
        setError(result.error ?? "Không thể lưu mẫu.");
        return;
      }

      onSuccess();
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="dialog"
    >
      <form
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/10 bg-zinc-950 p-4 sm:rounded-2xl"
        onSubmit={handleSubmit}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            {mode === "create" ? "Tạo mẫu" : "Sửa mẫu"}
          </h2>
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
            rows={2}
            value={description}
          />

          <Textarea
            disabled={isPending}
            label="Nội dung mẫu"
            onChange={(event) => setBody(event.target.value)}
            required
            rows={12}
            value={body}
          />

          {error ? (
            <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-100">
              {error}
            </p>
          ) : null}

          <Button disabled={isPending} loading={isPending} type="submit">
            {mode === "create" ? "Tạo mẫu" : "Lưu thay đổi"}
          </Button>
        </div>
      </form>
    </div>
  );
}
