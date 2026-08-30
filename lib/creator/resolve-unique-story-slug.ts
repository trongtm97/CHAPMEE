import { appendSlugSuffix, slugifyVietnamese } from "@/lib/seo/slugify-vi";
import type { DatabaseClient } from "@/lib/db/types";

export function normalizeStorySlugInput(input: string): string {
  return slugifyVietnamese(input.trim()) || "truyen-moi";
}

/** Trả về slug chưa trùng trong bảng stories (có thể thêm -1, -2…). */
export async function resolveUniqueStorySlug(
  db: DatabaseClient,
  rawSlug: string,
  excludeStoryId?: string
): Promise<string> {
  const base = normalizeStorySlugInput(rawSlug);
  let candidate = base;
  let suffix = 1;

  for (;;) {
    const query = db.from("stories").select("id").eq("slug", candidate).limit(1);

    const { data, error } = excludeStoryId
      ? await query.neq("id", excludeStoryId).maybeSingle()
      : await query.maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return candidate;
    }

    candidate = appendSlugSuffix(base, suffix);
    suffix += 1;

    if (suffix > 200) {
      return `${base}-${Date.now().toString(36)}`;
    }
  }
}
