import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getStoryMonetizationCapabilities } from "@/lib/content-origin/content-origin-policy";
import type {
  StoryMonetizationCapabilities,
  StoryOriginPolicyInput
} from "@/lib/content-origin/content-origin-types";
import { getContentOriginPolicySettings } from "@/lib/settings/content-origin-policy-settings";

function rowToInput(row: Record<string, unknown> | undefined): StoryOriginPolicyInput {
  if (!row) return {};
  return {
    id: String(row.id ?? ""),
    content_origin: (row.content_origin as string | null) ?? null,
    translation_type: (row.translation_type as string | null) ?? null,
    rights_status: (row.rights_status as string | null) ?? null,
    monetization_policy: (row.monetization_policy as string | null) ?? null,
    rights_expires_at: (row.rights_expires_at as string | null) ?? null
  };
}

export async function loadStoryOriginPolicy(
  storyId: string
): Promise<StoryMonetizationCapabilities> {
  try {
    const [settings, result] = await Promise.all([
      getContentOriginPolicySettings(),
      db.execute(sql`
        select
          id,
          content_origin,
          translation_type,
          rights_status,
          monetization_policy,
          rights_expires_at
        from public.stories
        where id = ${storyId}::uuid
        limit 1
      `)
    ]);
    const row = result.rows[0] as Record<string, unknown> | undefined;
    return getStoryMonetizationCapabilities(rowToInput(row), settings);
  } catch {
    // Safe fallback keeps legacy stories functional if migration is not applied yet.
    return getStoryMonetizationCapabilities({});
  }
}

