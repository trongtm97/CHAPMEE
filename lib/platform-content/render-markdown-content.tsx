import { ContentPostBody } from "@/components/content-posts/ContentPostBody";

type Block =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "h4"; text: string }
  | { type: "p"; text: string }
  | { type: "quote"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "hr" }
  | { type: "img"; alt: string; url: string }
  | { type: "html"; text: string };

function isMarkdownTableRow(line: string) {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|");
}

function isMarkdownTableSeparator(line: string) {
  return /^\|?[\s:-]+\|[\s|:-]+\|?$/.test(line.trim());
}

export function parseMarkdownContent(content: string): Block[] {
  const lines = content.split("\n");
  const blocks: Block[] = [];
  let listBuffer: { type: "ul" | "ol"; items: string[] } | null = null;
  let tableRows: string[][] | null = null;

  function flushList() {
    if (listBuffer) {
      blocks.push(listBuffer);
      listBuffer = null;
    }
  }

  function flushTable() {
    if (!tableRows || tableRows.length === 0) {
      tableRows = null;
      return;
    }
    const serialized = tableRows.map((row) => `| ${row.join(" | ")} |`).join("\n");
    blocks.push({ type: "html", text: serialized });
    tableRows = null;
  }

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      flushTable();
      continue;
    }

    if (isMarkdownTableRow(trimmed)) {
      flushList();
      if (isMarkdownTableSeparator(trimmed)) {
        continue;
      }
      if (!tableRows) {
        tableRows = [];
      }
      tableRows.push(
        trimmed
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((cell) => cell.trim())
      );
      continue;
    }

    flushTable();

    if (/^<[a-z][\s\S]*>$/i.test(trimmed)) {
      flushList();
      blocks.push({ type: "html", text: trimmed });
      continue;
    }

    if (trimmed === "---") {
      flushList();
      blocks.push({ type: "hr" });
      continue;
    }

    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      flushList();
      blocks.push({ type: "img", alt: imgMatch[1] ?? "", url: imgMatch[2] ?? "" });
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
  flushTable();
  return blocks;
}

export function renderMarkdownContent(content: string) {
  return <ContentPostBody content={content} />;
}
