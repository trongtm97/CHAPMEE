"use client";

import { Button, Input } from "@/components/ui";
import { DEFAULT_SYSTEM_GAME_TEMPLATE } from "@/lib/presentation/default-templates";
import type { SystemGameBlock, SystemGameStructuredContent } from "@/types/presentation";
import { useCallback, useMemo } from "react";

type SystemGameBlockEditorProps = {
  valueJson: string;
  onChange: (json: string) => void;
  disabled?: boolean;
};

function parseOrDefault(json: string): SystemGameStructuredContent {
  try {
    const parsed = JSON.parse(json) as SystemGameStructuredContent;
    if (Array.isArray(parsed.blocks)) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_SYSTEM_GAME_TEMPLATE;
}

export function SystemGameBlockEditor({
  disabled = false,
  onChange,
  valueJson
}: SystemGameBlockEditorProps) {
  const data = useMemo(() => parseOrDefault(valueJson), [valueJson]);

  const sync = useCallback(
    (next: SystemGameStructuredContent) => {
      onChange(JSON.stringify(next, null, 2));
    },
    [onChange]
  );

  const updateBlock = (index: number, block: SystemGameBlock) => {
    const blocks = [...data.blocks];
    blocks[index] = block;
    sync({ blocks });
  };

  const addBlock = (type: SystemGameBlock["type"]) => {
    const block: SystemGameBlock =
      type === "prose"
        ? { type: "prose", content: "" }
        : type === "system_notice"
          ? { type: "system_notice", title: "Hệ thống", content: "" }
          : type === "stats"
            ? {
                type: "stats",
                title: "Trạng thái",
                items: [{ label: "HP", value: "100/100" }]
              }
            : { type: "reward", title: "Phần thưởng", items: ["+1 EXP"] };
    sync({ blocks: [...data.blocks, block] });
  };

  const removeBlock = (index: number) => {
    sync({ blocks: data.blocks.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-zinc-950/50 p-4">
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={disabled}
          onClick={() => addBlock("system_notice")}
          type="button"
          variant="secondary"
        >
          + Thông báo
        </Button>
        <Button disabled={disabled} onClick={() => addBlock("stats")} type="button" variant="secondary">
          + Stats
        </Button>
        <Button disabled={disabled} onClick={() => addBlock("reward")} type="button" variant="secondary">
          + Reward
        </Button>
        <Button disabled={disabled} onClick={() => addBlock("prose")} type="button" variant="secondary">
          + Văn xuôi
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

          {block.type === "prose" ? (
            <textarea
              className="min-h-[5rem] w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
              disabled={disabled}
              onChange={(e) => updateBlock(index, { type: "prose", content: e.target.value })}
              value={block.content}
            />
          ) : (
            <>
              {"title" in block ? (
                <Input
                  disabled={disabled}
                  label="Tiêu đề"
                  onChange={(e) =>
                    updateBlock(index, { ...block, title: e.target.value } as SystemGameBlock)
                  }
                  value={block.title ?? ""}
                />
              ) : null}
              {block.type === "system_notice" ? (
                <textarea
                  className="min-h-[4rem] w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
                  disabled={disabled}
                  onChange={(e) =>
                    updateBlock(index, {
                      type: "system_notice",
                      title: block.title,
                      content: e.target.value
                    })
                  }
                  value={block.content}
                />
              ) : null}
              {block.type === "stats" ? (
                <div className="space-y-2">
                  {block.items.map((item, itemIndex) => (
                    <div className="grid gap-2 sm:grid-cols-2" key={itemIndex}>
                      <Input
                        disabled={disabled}
                        label="Nhãn"
                        onChange={(e) => {
                          const items = [...block.items];
                          items[itemIndex] = { ...item, label: e.target.value };
                          updateBlock(index, { ...block, items });
                        }}
                        value={item.label}
                      />
                      <Input
                        disabled={disabled}
                        label="Giá trị"
                        onChange={(e) => {
                          const items = [...block.items];
                          items[itemIndex] = { ...item, value: e.target.value };
                          updateBlock(index, { ...block, items });
                        }}
                        value={item.value}
                      />
                    </div>
                  ))}
                  <Button
                    disabled={disabled}
                    onClick={() =>
                      updateBlock(index, {
                        ...block,
                        items: [...block.items, { label: "", value: "" }]
                      })
                    }
                    type="button"
                    variant="secondary"
                  >
                    + Stat
                  </Button>
                </div>
              ) : null}
              {block.type === "reward" ? (
                <textarea
                  className="min-h-[4rem] w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
                  disabled={disabled}
                  onChange={(e) =>
                    updateBlock(index, {
                      type: "reward",
                      title: block.title,
                      items: e.target.value.split("\n").filter(Boolean)
                    })
                  }
                  placeholder="Mỗi dòng một phần thưởng"
                  value={block.items.join("\n")}
                />
              ) : null}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
