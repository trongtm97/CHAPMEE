import { STUDIO_BASE_PATH } from "@/lib/studio/constants";

export function resolveReturnBasePath(
  raw: FormDataEntryValue | null | undefined
): string {
  const value = String(raw ?? STUDIO_BASE_PATH)
    .trim()
    .replace(/\/$/, "");

  if (!value || !value.startsWith(STUDIO_BASE_PATH)) {
    return STUDIO_BASE_PATH;
  }

  return value;
}
