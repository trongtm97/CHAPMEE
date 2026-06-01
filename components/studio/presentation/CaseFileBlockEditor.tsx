"use client";

import { Button, Input } from "@/components/ui";
import { DEFAULT_CASE_FILE_TEMPLATE } from "@/lib/presentation/default-templates";
import type { CaseFileSection, CaseFileStructuredContent } from "@/types/presentation";
import { useCallback, useMemo } from "react";

type CaseFileBlockEditorProps = {
  valueJson: string;
  onChange: (json: string) => void;
  disabled?: boolean;
};

function parseOrDefault(json: string): CaseFileStructuredContent {
  try {
    const parsed = JSON.parse(json) as CaseFileStructuredContent;
    if (Array.isArray(parsed.sections)) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_CASE_FILE_TEMPLATE;
}

export function CaseFileBlockEditor({
  disabled = false,
  onChange,
  valueJson
}: CaseFileBlockEditorProps) {
  const data = useMemo(() => parseOrDefault(valueJson), [valueJson]);

  const sync = useCallback(
    (next: CaseFileStructuredContent) => {
      onChange(JSON.stringify(next, null, 2));
    },
    [onChange]
  );

  const updateMeta = (patch: Partial<CaseFileStructuredContent>) => {
    sync({ ...data, ...patch });
  };

  const updateSection = (index: number, section: CaseFileSection) => {
    const sections = [...data.sections];
    sections[index] = section;
    sync({ ...data, sections });
  };

  const addSection = (type: CaseFileSection["type"]) => {
    const section: CaseFileSection =
      type === "summary" || type === "note"
        ? { type, title: type === "summary" ? "Tóm tắt" : "Ghi chú", content: "" }
        : type === "timeline"
          ? { type: "timeline", title: "Dòng thời gian", items: [{ time: "", content: "" }] }
          : { type: "evidence", title: "Bằng chứng", items: [{ label: "Mục A", content: "" }] };
    sync({ ...data, sections: [...data.sections, section] });
  };

  const removeSection = (index: number) => {
    sync({ ...data, sections: data.sections.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-zinc-950/50 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          disabled={disabled}
          label="Tiêu đề hồ sơ"
          onChange={(e) => updateMeta({ case_title: e.target.value })}
          value={data.case_title ?? ""}
        />
        <Input
          disabled={disabled}
          label="Mã hồ sơ"
          onChange={(e) => updateMeta({ case_code: e.target.value })}
          value={data.case_code ?? ""}
        />
        <Input
          disabled={disabled}
          label="Trạng thái"
          onChange={(e) => updateMeta({ status: e.target.value })}
          value={data.status ?? ""}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button disabled={disabled} onClick={() => addSection("summary")} type="button" variant="secondary">
          + Tóm tắt
        </Button>
        <Button disabled={disabled} onClick={() => addSection("timeline")} type="button" variant="secondary">
          + Timeline
        </Button>
        <Button disabled={disabled} onClick={() => addSection("evidence")} type="button" variant="secondary">
          + Bằng chứng
        </Button>
        <Button disabled={disabled} onClick={() => addSection("note")} type="button" variant="secondary">
          + Ghi chú
        </Button>
      </div>

      <div className="space-y-3">
        {data.sections.map((section, index) => (
          <div
            className="space-y-2 rounded-lg border border-white/10 bg-zinc-900/50 p-3"
            key={index}
          >
            <div className="flex items-center justify-between gap-2">
              <Input
                disabled={disabled}
                label="Tiêu đề mục"
                onChange={(e) =>
                  updateSection(index, { ...section, title: e.target.value } as CaseFileSection)
                }
                value={section.title}
              />
              <button
                className="shrink-0 text-xs text-red-300"
                disabled={disabled}
                onClick={() => removeSection(index)}
                type="button"
              >
                Xóa mục
              </button>
            </div>

            {section.type === "summary" || section.type === "note" ? (
              <textarea
                className="min-h-[5rem] w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
                disabled={disabled}
                onChange={(e) =>
                  updateSection(index, {
                    ...section,
                    content: e.target.value
                  } as CaseFileSection)
                }
                value={section.content}
              />
            ) : null}

            {section.type === "timeline" ? (
              <div className="space-y-2">
                {section.items.map((item, itemIndex) => (
                  <div className="grid gap-2 sm:grid-cols-[6rem_1fr]" key={itemIndex}>
                    <Input
                      disabled={disabled}
                      label="Giờ"
                      onChange={(e) => {
                        const items = [...section.items];
                        items[itemIndex] = { ...item, time: e.target.value };
                        updateSection(index, { ...section, items });
                      }}
                      value={item.time}
                    />
                    <textarea
                      className="min-h-[3rem] rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
                      disabled={disabled}
                      onChange={(e) => {
                        const items = [...section.items];
                        items[itemIndex] = { ...item, content: e.target.value };
                        updateSection(index, { ...section, items });
                      }}
                      value={item.content}
                    />
                  </div>
                ))}
                <Button
                  disabled={disabled}
                  onClick={() =>
                    updateSection(index, {
                      ...section,
                      items: [...section.items, { time: "", content: "" }]
                    })
                  }
                  type="button"
                  variant="secondary"
                >
                  + Mốc thời gian
                </Button>
              </div>
            ) : null}

            {section.type === "evidence" ? (
              <div className="space-y-2">
                {section.items.map((item, itemIndex) => (
                  <div className="space-y-1" key={itemIndex}>
                    <Input
                      disabled={disabled}
                      label="Nhãn"
                      onChange={(e) => {
                        const items = [...section.items];
                        items[itemIndex] = { ...item, label: e.target.value };
                        updateSection(index, { ...section, items });
                      }}
                      value={item.label}
                    />
                    <textarea
                      className="min-h-[3rem] w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
                      disabled={disabled}
                      onChange={(e) => {
                        const items = [...section.items];
                        items[itemIndex] = { ...item, content: e.target.value };
                        updateSection(index, { ...section, items });
                      }}
                      value={item.content}
                    />
                  </div>
                ))}
                <Button
                  disabled={disabled}
                  onClick={() =>
                    updateSection(index, {
                      ...section,
                      items: [...section.items, { label: "Mục mới", content: "" }]
                    })
                  }
                  type="button"
                  variant="secondary"
                >
                  + Bằng chứng
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
