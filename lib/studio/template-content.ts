import type { StudioTemplateContent } from "@/types/templates";

export function parseTemplateContent(value: unknown): StudioTemplateContent {
  if (typeof value === "string") {
    return { body: value, format: "plain" };
  }

  if (value && typeof value === "object" && "body" in value) {
    const body = (value as { body: unknown }).body;

    return {
      body: typeof body === "string" ? body : "",
      format: "plain"
    };
  }

  return { body: "", format: "plain" };
}

export function getTemplateBody(content: unknown) {
  return parseTemplateContent(content).body.trim();
}

export function buildTemplatePreview(plainText: string | null, body: string, max = 160) {
  const source = (plainText ?? body).replace(/\s+/g, " ").trim();

  if (source.length <= max) {
    return source;
  }

  return `${source.slice(0, max - 1)}…`;
}
