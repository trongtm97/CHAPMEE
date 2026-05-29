export type TextareaFormatAction =
  | "bold"
  | "italic"
  | "quote"
  | "divider"
  | "heading"
  | "clear";

type SelectionRange = {
  start: number;
  end: number;
};

function getSelection(textarea: HTMLTextAreaElement): SelectionRange {
  return {
    end: textarea.selectionEnd,
    start: textarea.selectionStart
  };
}

function applyWrap(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string,
  placeholder: string
) {
  const { end, start } = getSelection(textarea);
  const value = textarea.value;
  const selected = value.slice(start, end) || placeholder;
  const next =
    value.slice(0, start) + before + selected + after + value.slice(end);

  textarea.value = next;
  textarea.focus();
  const cursor = start + before.length + selected.length + after.length;
  textarea.setSelectionRange(cursor, cursor);

  return next;
}

function applyLinePrefix(
  textarea: HTMLTextAreaElement,
  prefix: string,
  placeholder: string
) {
  const { end, start } = getSelection(textarea);
  const value = textarea.value;
  const block = value.slice(start, end) || placeholder;
  const lines = block.split("\n");
  const formatted = lines.map((line) => `${prefix}${line}`).join("\n");
  const next = value.slice(0, start) + formatted + value.slice(end);

  textarea.value = next;
  textarea.focus();

  return next;
}

export function applyTextareaFormat(
  textarea: HTMLTextAreaElement,
  action: TextareaFormatAction
) {
  switch (action) {
    case "bold":
      return applyWrap(textarea, "**", "**", "in đậm");
    case "italic":
      return applyWrap(textarea, "_", "_", "in nghiêng");
    case "quote":
      return applyLinePrefix(textarea, "> ", "trích dẫn");
    case "heading":
      return applyLinePrefix(textarea, "## ", "tiêu đề nhỏ");
    case "divider":
      return applyWrap(textarea, "\n\n---\n\n", "", "");
    case "clear": {
      const { end, start } = getSelection(textarea);
      const value = textarea.value;
      const selected = value.slice(start, end);
      const stripped = selected
        .replace(/\*\*/g, "")
        .replace(/_/g, "")
        .replace(/^>\s?/gm, "")
        .replace(/^##\s?/gm, "");
      const next = value.slice(0, start) + stripped + value.slice(end);
      textarea.value = next;
      textarea.focus();
      return next;
    }
    default:
      return textarea.value;
  }
}
