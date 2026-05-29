"use client";

import { useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";
import {
  updateQualityConfigAction,
  type QualityConfigFormState
} from "@/lib/admin/update-quality-config";

type AdminQualitySettingsFormProps = {
  initial: QualityConfigFormState;
};

export function AdminQualitySettingsForm({ initial }: AdminQualitySettingsFormProps) {
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateQualityConfigAction(form);
      if (!result.ok) {
        setError(result.error ?? "Không lưu được.");
        return;
      }
      setMessage("Đã lưu cấu hình chất lượng nội dung.");
    });
  }

  const fields: Array<{
    key: keyof QualityConfigFormState;
    label: string;
    type: "number" | "boolean";
  }> = [
    { key: "minRatingsForQualityAction", label: "Số đánh giá tối thiểu", type: "number" },
    { key: "lowRatingThreshold", label: "Ngưỡng rating thấp", type: "number" },
    { key: "minReportsForReview", label: "Số báo cáo tối thiểu", type: "number" },
    { key: "earlyDropThreshold", label: "Ngưỡng bỏ đọc sớm (0–1)", type: "number" },
    {
      key: "requireModeratorConfirmationForPenalty",
      label: "Bắt moderator xác nhận trước phạt",
      type: "boolean"
    },
    { key: "maxLowQualityAttempts", label: "Số lần cảnh báo tối đa", type: "number" },
    {
      key: "permanentHideAfterMaxAttempts",
      label: "Ẩn vĩnh viễn sau đủ lần",
      type: "boolean"
    },
    {
      key: "disableMonetizationAfterPermanentHide",
      label: "Tắt kiếm tiền sau ẩn vĩnh viễn",
      type: "boolean"
    },
    { key: "minContentWordsStory", label: "Từ tối thiểu (truyện)", type: "number" },
    { key: "minContentWordsChapter", label: "Từ tối thiểu (chương)", type: "number" }
  ];

  return (
    <div className="space-y-4 max-w-lg">
      {fields.map((field) =>
        field.type === "boolean" ? (
          <label key={field.key} className="flex items-center gap-2 text-sm text-zinc-200">
            <input
              checked={Boolean(form[field.key])}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, [field.key]: e.target.checked }))
              }
              type="checkbox"
            />
            {field.label}
          </label>
        ) : (
          <Input
            key={field.key}
            label={field.label}
            type="number"
            value={String(form[field.key])}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                [field.key]: Number(e.target.value)
              }))
            }
          />
        )
      )}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
      <Button disabled={pending} onClick={save} type="button">
        {pending ? "Đang lưu…" : "Lưu cấu hình"}
      </Button>
    </div>
  );
}
