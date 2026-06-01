import { escapePlainTextContent } from "@/lib/platform-content/render-content";

type Block =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "h4"; text: string }
  | { type: "p"; text: string }
  | { type: "quote"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "hr" };

export function parseMarkdownContent(content: string): Block[] {
  const lines = content.split("\n");
  const blocks: Block[] = [];
  let listBuffer: { type: "ul" | "ol"; items: string[] } | null = null;

  function flushList() {
    if (listBuffer) {
      blocks.push(listBuffer);
      listBuffer = null;
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    if (trimmed === "---") {
      flushList();
      blocks.push({ type: "hr" });
      continue;
    }

    if (trimmed.startsWith("#### ")) {
      flushList();
      blocks.push({ type: "h4", text: trimmed.slice(5) });
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushList();
      blocks.push({ type: "h3", text: trimmed.slice(4) });
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushList();
      blocks.push({ type: "h2", text: trimmed.slice(3) });
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushList();
      blocks.push({ type: "p", text: `[H1 không được dùng] ${trimmed.slice(2)}` });
      continue;
    }

    if (trimmed.startsWith("> ")) {
      flushList();
      blocks.push({ type: "quote", text: trimmed.slice(2) });
      continue;
    }

    const ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      if (!listBuffer || listBuffer.type !== "ul") {
        flushList();
        listBuffer = { type: "ul", items: [] };
      }
      listBuffer.items.push(ulMatch[1]);
      continue;
    }

    const olMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (olMatch) {
      if (!listBuffer || listBuffer.type !== "ol") {
        flushList();
        listBuffer = { type: "ol", items: [] };
      }
      listBuffer.items.push(olMatch[1]);
      continue;
    }

    flushList();
    blocks.push({ type: "p", text: trimmed });
  }

  flushList();
  return blocks;
}

function renderInline(text: string) {
  const safe = escapePlainTextContent(text);
  return safe
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/\[(.+?)\]\((\/[^)]+)\)/g, '<a href="$2" class="text-cyan-600 hover:underline">$1</a>');
}

export function renderMarkdownContent(content: string) {
  const blocks = parseMarkdownContent(content);

  return blocks.map((block, index) => {
    if (block.type === "h2") {
      return (
        <h2
          className="text-2xl font-semibold text-foreground"
          dangerouslySetInnerHTML={{ __html: renderInline(block.text) }}
          key={index}
        />
      );
    }
    if (block.type === "h3") {
      return (
        <h3
          className="text-xl font-semibold text-foreground"
          dangerouslySetInnerHTML={{ __html: renderInline(block.text) }}
          key={index}
        />
      );
    }
    if (block.type === "h4") {
      return (
        <h4
          className="text-lg font-semibold text-foreground"
          dangerouslySetInnerHTML={{ __html: renderInline(block.text) }}
          key={index}
        />
      );
    }
    if (block.type === "quote") {
      return (
        <blockquote
          className="border-l-4 border-muted-foreground/30 pl-4 italic text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: renderInline(block.text) }}
          key={index}
        />
      );
    }
    if (block.type === "ul") {
      return (
        <ul className="list-disc space-y-1 pl-5" key={index}>
          {block.items.map((item, i) => (
            <li dangerouslySetInnerHTML={{ __html: renderInline(item) }} key={i} />
          ))}
        </ul>
      );
    }
    if (block.type === "ol") {
      return (
        <ol className="list-decimal space-y-1 pl-5" key={index}>
          {block.items.map((item, i) => (
            <li dangerouslySetInnerHTML={{ __html: renderInline(item) }} key={i} />
          ))}
        </ol>
      );
    }
    if (block.type === "hr") {
      return <hr className="border-border" key={index} />;
    }
    return (
      <p
        className="text-foreground"
        dangerouslySetInnerHTML={{ __html: renderInline(block.text) }}
        key={index}
      />
    );
  });
}
