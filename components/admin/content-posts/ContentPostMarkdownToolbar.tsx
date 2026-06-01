"use client";

type Props = {
  onInsert: (snippet: string, cursorOffset?: number) => void;
};

const TOOLS = [
  { label: "H2", snippet: "## Tiêu đề\n\n", offset: 0 },
  { label: "H3", snippet: "### Tiêu đề\n\n", offset: 0 },
  { label: "H4", snippet: "#### Tiêu đề\n\n", offset: 0 },
  { label: "B", snippet: "**đậm**", offset: 2 },
  { label: "I", snippet: "_nghiêng_", offset: 1 },
  { label: "Quote", snippet: "> Trích dẫn\n\n", offset: 0 },
  { label: "List", snippet: "- Mục 1\n- Mục 2\n\n", offset: 0 },
  { label: "1.", snippet: "1. Mục 1\n2. Mục 2\n\n", offset: 0 },
  { label: "---", snippet: "\n---\n\n", offset: 0 },
  { label: "Link nội bộ", snippet: "[Nhãn](/duong-dan)", offset: 1 }
];

export function ContentPostMarkdownToolbar({ onInsert }: Props) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-white/10 bg-zinc-900/80 p-1">
      {TOOLS.map((tool) => (
        <button
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white"
          key={tool.label}
          onClick={() => onInsert(tool.snippet, tool.offset)}
          type="button"
        >
          {tool.label}
        </button>
      ))}
      <span className="self-center px-2 text-[10px] text-zinc-500">Không dùng H1 trong nội dung</span>
    </div>
  );
}
