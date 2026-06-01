"use client";

import { Button, Input } from "@/components/ui";
import { DEFAULT_SCRIPT_TEMPLATE } from "@/lib/presentation/default-templates";
import type { ScriptLine, ScriptStructuredContent } from "@/types/presentation";
import { useCallback, useMemo } from "react";

type ScriptBlockEditorProps = {
  valueJson: string;
  onChange: (json: string) => void;
  disabled?: boolean;
};

function parseOrDefault(json: string): ScriptStructuredContent {
  try {
    const parsed = JSON.parse(json) as ScriptStructuredContent;
    if (Array.isArray(parsed.lines)) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_SCRIPT_TEMPLATE;
}

export function ScriptBlockEditor({
  disabled = false,
  onChange,
  valueJson
}: ScriptBlockEditorProps) {
  const data = useMemo(() => parseOrDefault(valueJson), [valueJson]);

  const sync = useCallback(
    (next: ScriptStructuredContent) => {
      onChange(JSON.stringify(next, null, 2));
    },
    [onChange]
  );

  const updateLine = (index: number, line: ScriptLine) => {
    const lines = [...data.lines];
    lines[index] = line;
    sync({ lines });
  };

  const addLine = (type: ScriptLine["type"]) => {
    const line: ScriptLine =
      type === "dialogue"
        ? { type: "dialogue", speaker: "NHÂN VẬT", text: "" }
        : type === "scene"
          ? { type: "scene", text: "INT. ĐỊA ĐIỂM - BAN NGÀY" }
          : { type: "action", text: "" };
    sync({ lines: [...data.lines, line] });
  };

  const removeLine = (index: number) => {
    sync({ lines: data.lines.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-zinc-950/50 p-4">
      <div className="flex flex-wrap gap-2">
        <Button disabled={disabled} onClick={() => addLine("scene")} type="button" variant="secondary">
          + Cảnh
        </Button>
        <Button disabled={disabled} onClick={() => addLine("action")} type="button" variant="secondary">
          + Hành động
        </Button>
        <Button
          disabled={disabled}
          onClick={() => addLine("dialogue")}
          type="button"
          variant="secondary"
        >
          + Thoại
        </Button>
      </div>

      {data.lines.map((line, index) => (
        <div
          className="space-y-2 rounded-lg border border-white/10 bg-zinc-900/50 p-3"
          key={index}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-zinc-500">{line.type}</span>
            <button
              className="text-xs text-red-300"
              disabled={disabled}
              onClick={() => removeLine(index)}
              type="button"
            >
              Xóa
            </button>
          </div>

          {line.type === "dialogue" ? (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  disabled={disabled}
                  label="Nhân vật"
                  onChange={(e) =>
                    updateLine(index, { ...line, speaker: e.target.value })
                  }
                  value={line.speaker}
                />
                <Input
                  disabled={disabled}
                  label="Chú thích (tuỳ chọn)"
                  onChange={(e) =>
                    updateLine(index, {
                      ...line,
                      parenthetical: e.target.value
                    })
                  }
                  value={line.parenthetical ?? ""}
                />
              </div>
              <textarea
                className="min-h-[3rem] w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
                disabled={disabled}
                onChange={(e) => updateLine(index, { ...line, text: e.target.value })}
                value={line.text}
              />
            </>
          ) : (
            <textarea
              className="min-h-[3rem] w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
              disabled={disabled}
              onChange={(e) =>
                updateLine(index, { type: line.type, text: e.target.value })
              }
              value={line.text}
            />
          )}
        </div>
      ))}
    </div>
  );
}
