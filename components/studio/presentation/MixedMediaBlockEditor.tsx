"use client";

import { Button, Input } from "@/components/ui";
import { DEFAULT_MIXED_MEDIA_TEMPLATE } from "@/lib/presentation/default-templates";
import type { MixedMediaBlock, MixedMediaStructuredContent } from "@/types/presentation";
import { useCallback, useMemo } from "react";

type MixedMediaBlockEditorProps = {
  valueJson: string;
  onChange: (json: string) => void;
  disabled?: boolean;
};

function parseOrDefault(json: string): MixedMediaStructuredContent {
  try {
    const parsed = JSON.parse(json) as MixedMediaStructuredContent;
    if (Array.isArray(parsed.blocks)) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_MIXED_MEDIA_TEMPLATE;
}

export function MixedMediaBlockEditor({
  disabled = false,
  onChange,
  valueJson
}: MixedMediaBlockEditorProps) {
  const data = useMemo(() => parseOrDefault(valueJson), [valueJson]);

  const sync = useCallback(
    (next: MixedMediaStructuredContent) => {
      onChange(JSON.stringify(next, null, 2));
    },
    [onChange]
  );

  const updateBlock = (index: number, block: MixedMediaBlock) => {
    const blocks = [...data.blocks];
    blocks[index] = block;
    sync({ blocks });
  };

  const addBlock = (type: MixedMediaBlock["type"]) => {
    const block: MixedMediaBlock =
      type === "prose"
        ? { type: "prose", content: "" }
        : type === "notice"
          ? { type: "notice", title: "Ghi chú", content: "" }
          : type === "quote"
            ? { type: "quote", content: "", attribution: "" }
            : { type: "divider" };
    sync({ blocks: [...data.blocks, block] });
  };

  const removeBlock = (index: number) => {
    sync({ blocks: data.blocks.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-zinc-950/50 p-4">
      <div className="flex flex-wrap gap-2">
        <Button disabled={disabled} onClick={() => addBlock("prose")} type="button" variant="secondary">
          + Văn xuôi
        </Button>
        <Button disabled={disabled} onClick={() => addBlock("notice")} type="button" variant="secondary">
          + Thông báo
        </Button>
        <Button disabled={disabled} onClick={() => addBlock("quote")} type="button" variant="secondary">
          + Trích dẫn
        </Button>
        <Button
          disabled={disabled}
          onClick={() => addBlock("divider")}
          type="button"
          variant="secondary"
        >
          + Ngăn cách
        </Button>
      </div>

      {data.blocks.map((block, index) => (
        <div
          className="space-y-2 rounded-lg border border-white/10 bg-zinc-900/50 p-3"
          key={index}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-zinc-500">{block.type}</span>
            <button
              className="text-xs text-red-300"
              disabled={disabled}
              onClick={() => removeBlock(index)}
              type="button"
            >
              Xóa
            </button>
          </div>

          {block.type === "divider" ? (
            <p className="text-xs text-zinc-500">Đường ngăn cách khi đọc</p>
          ) : null}

          {block.type === "prose" ? (
            <textarea
              className="min-h-[5rem] w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
              disabled={disabled}
              onChange={(e) => updateBlock(index, { type: "prose", content: e.target.value })}
              value={block.content}
            />
          ) : null}

          {block.type === "notice" ? (
            <>
              <Input
                disabled={disabled}
                label="Tiêu đề"
                onChange={(e) =>
                  updateBlock(index, {
                    type: "notice",
                    title: e.target.value,
                    content: block.content
                  })
                }
                value={block.title ?? ""}
              />
              <textarea
                className="min-h-[3rem] w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
                disabled={disabled}
                onChange={(e) =>
                  updateBlock(index, {
                    type: "notice",
                    title: block.title,
                    content: e.target.value
                  })
                }
                value={block.content}
              />
            </>
          ) : null}

          {block.type === "quote" ? (
            <>
              <textarea
                className="min-h-[3rem] w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
                disabled={disabled}
                onChange={(e) =>
                  updateBlock(index, {
                    type: "quote",
                    content: e.target.value,
                    attribution: block.attribution
                  })
                }
                value={block.content}
              />
              <Input
                disabled={disabled}
                label="Nguồn / tác giả trích dẫn"
                onChange={(e) =>
                  updateBlock(index, {
                    type: "quote",
                    content: block.content,
                    attribution: e.target.value
                  })
                }
                value={block.attribution ?? ""}
              />
            </>
          ) : null}
        </div>
      ))}
    </div>
  );
}
