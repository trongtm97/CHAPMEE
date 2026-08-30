import { createClient } from "@/lib/data/server";
import type { StudioDraftVersionRecord } from "@/types/drafts";

type VersionRow = {
  id: string;
  draft_id: string;
  version_number: number;
  title: string | null;
  content: Record<string, unknown>;
  plain_text: string | null;
  word_count: number;
  created_at: string;
};

export async function getStudioDraftVersions(
  profileId: string,
  draftId: string
): Promise<{ versions: StudioDraftVersionRecord[]; error: string | null }> {
  try {
    const db = await createClient();

    const { data: draft, error: draftError } = await db
      .from("creator_drafts")
      .select("id")
      .eq("id", draftId)
      .eq("owner_id", profileId)
      .maybeSingle();

    if (draftError) {
      throw new Error(draftError.message);
    }

    if (!draft) {
      return { error: "Không tìm thấy nháp.", versions: [] };
    }

    const { data, error } = await db
      .from("creator_draft_versions")
      .select(
        "id, draft_id, version_number, title, content, plain_text, word_count, created_at"
      )
      .eq("draft_id", draftId)
      .order("version_number", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return {
      error: null,
      versions: ((data ?? []) as VersionRow[]).map((row) => ({
        content: row.content ?? {},
        createdAt: row.created_at,
        draftId: row.draft_id,
        id: row.id,
        plainText: row.plain_text,
        title: row.title,
        versionNumber: row.version_number,
        wordCount: row.word_count
      }))
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Không thể tải lịch sử phiên bản.",
      versions: []
    };
  }
}
