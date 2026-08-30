import { parseKeywordsInput } from "@/lib/seo/suggest-keywords";

export function parseSeoTitleField(formData: FormData) {
  return String(formData.get("seo_title") ?? "").trim();
}

export function parseSeoDescriptionField(formData: FormData) {
  return String(formData.get("seo_description") ?? "").trim();
}

export function parseSeoKeywordsField(formData: FormData) {
  const raw = String(formData.get("seo_keywords") ?? "").trim();

  if (!raw) {
    return [] as string[];
  }

  return parseKeywordsInput(raw);
}

function isPrivateAppCanonical(path: string) {
  const norm = path.startsWith("/") ? path : `/${path}`;
  return (
    norm.startsWith("/studio") ||
    norm.startsWith("/admin") ||
    norm.startsWith("/creator") ||
    norm.startsWith("/me")
  );
}

export function parseCanonicalUrlField(formData: FormData) {
  const value = String(formData.get("canonical_url") ?? "").trim();

  if (!value || isPrivateAppCanonical(value)) {
    return null;
  }

  return value;
}
