export function insertTemplateIntoContent(input: {
  content: string;
  selectionEnd: number;
  selectionStart: number;
  templateBody: string;
}) {
  const snippet = input.templateBody.trim();

  if (!snippet) {
    return input.content;
  }

  const before = input.content.slice(0, input.selectionStart);
  const after = input.content.slice(input.selectionEnd);
  const prefix = before.length > 0 && !before.endsWith("\n\n") ? "\n\n" : "";
  const suffix = after.length > 0 && !after.startsWith("\n\n") ? "\n\n" : "";

  return `${before}${prefix}${snippet}${suffix}${after}`;
}
