/** Render plain text / markdown nhẹ thành HTML an toàn cho preview. */
export function renderPlainContentToHtml(content: string) {
  const paragraphs = content
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return "";
  }

  return paragraphs
    .map((block) => {
      if (block === "---") {
        return '<hr class="my-8 border-white/10" />';
      }

      const lines = block.split("\n");
      const htmlLines = lines.map((line) => {
        const trimmed = line.trim();

        if (trimmed.startsWith("> ")) {
          return `<blockquote class="border-l-2 border-cyan-400/50 pl-4 italic text-zinc-300">${escapeHtml(trimmed.slice(2))}</blockquote>`;
        }

        if (trimmed.startsWith("## ")) {
          return `<h3 class="mb-2 mt-4 text-lg font-bold text-white">${escapeHtml(trimmed.slice(3))}</h3>`;
        }

        let text = escapeHtml(trimmed);
        text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        text = text.replace(/_(.+?)_/g, "<em>$1</em>");

        return text;
      });

      return `<p class="mb-[1.15em] last:mb-0 leading-[1.82]">${htmlLines.join("<br />")}</p>`;
    })
    .join("");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
