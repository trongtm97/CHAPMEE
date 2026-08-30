import { createClient } from "@/lib/data/server";

export type ChapterManagerAuditAction =
  | "chapter_hide"
  | "chapter_delete_draft"
  | "chapter_batch_hide"
  | "chapter_batch_draft"
  | "chapter_batch_publish"
  | "chapter_batch_delete"
  | "chapter_renumber"
  | "chapter_export_csv";

type LogChapterManagerAuditInput = {
  action: ChapterManagerAuditAction;
  actorUserId: string;
  storyId: string;
  targetIds?: string[];
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
};

/** Ghi sự kiện quản lý chương — dùng analytics_events cho tới khi có bảng audit riêng. */
export async function logChapterManagerAudit(input: LogChapterManagerAuditInput) {
  try {
    const db = await createClient();
    await db.from("analytics_events").insert({
      event_name: "studio_chapter_manager",
      metadata: {
        action: input.action,
        after: input.after ?? null,
        before: input.before ?? null,
        story_id: input.storyId,
        target_ids: input.targetIds ?? []
      },
      target_id: input.targetIds?.[0] ?? null,
      target_type: "episode",
      user_id: input.actorUserId
    });
  } catch {
    // Audit không chặn thao tác chính.
  }
}
