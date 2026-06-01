"use client";

import { Button, Input } from "@/components/ui";
import { DEFAULT_DIARY_TEMPLATE } from "@/lib/presentation/default-templates";
import type { DiaryStructuredContent } from "@/types/presentation";
import { useCallback, useMemo } from "react";

type DiaryBlockEditorProps = {
  valueJson: string;
  onChange: (json: string) => void;
  disabled?: boolean;
};

function parseOrDefault(json: string): DiaryStructuredContent {
  try {
    const parsed = JSON.parse(json) as DiaryStructuredContent;
    if (Array.isArray(parsed.entries)) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_DIARY_TEMPLATE;
}

export function DiaryBlockEditor({
  disabled = false,
  onChange,
  valueJson
}: DiaryBlockEditorProps) {
  const data = useMemo(() => parseOrDefault(valueJson), [valueJson]);

  const sync = useCallback(
    (next: DiaryStructuredContent) => {
      onChange(JSON.stringify(next, null, 2));
    },
    [onChange]
  );

  const updateEntry = (
    index: number,
    patch: Partial<DiaryStructuredContent["entries"][number]>
  ) => {
    const entries = [...data.entries];
    entries[index] = { ...entries[index], ...patch };
    sync({ entries });
  };

  const addEntry = () => {
    sync({
      entries: [
        ...data.entries,
        {
          date: new Date().toISOString().slice(0, 10),
          title: "Entry mới",
          content: ""
        }
      ]
    });
  };

  const removeEntry = (index: number) => {
    sync({ entries: data.entries.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-zinc-950/50 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-200">Các entry nhật ký</p>
        <Button disabled={disabled} onClick={addEntry} type="button" variant="secondary">
          + Entry
        </Button>
      </div>

      {data.entries.map((entry, index) => (
        <div
          className="space-y-2 rounded-lg border border-white/10 bg-zinc-900/50 p-3"
          key={index}
        >
          <div className="flex justify-end">
            <button
              className="text-xs text-red-300"
              disabled={disabled}
              onClick={() => removeEntry(index)}
              type="button"
            >
              Xóa entry
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              disabled={disabled}
              label="Ngày"
              onChange={(e) => updateEntry(index, { date: e.target.value })}
              value={entry.date ?? ""}
            />
            <Input
              disabled={disabled}
              label="Địa điểm"
              onChange={(e) => updateEntry(index, { location: e.target.value })}
              value={entry.location ?? ""}
            />
            <Input
              disabled={disabled}
              label="Tâm trạng"
              onChange={(e) => updateEntry(index, { mood: e.target.value })}
              value={entry.mood ?? ""}
            />
            <Input
              disabled={disabled}
              label="Tiêu đề"
              onChange={(e) => updateEntry(index, { title: e.target.value })}
              value={entry.title ?? ""}
            />
          </div>
          <textarea
            className="min-h-[6rem] w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
            disabled={disabled}
            onChange={(e) => updateEntry(index, { content: e.target.value })}
            placeholder="Nội dung nhật ký..."
            value={entry.content}
          />
        </div>
      ))}
    </div>
  );
}
