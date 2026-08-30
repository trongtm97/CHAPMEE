import { createClient } from "@/lib/data/server";

type CreateModerationCaseInput = {
  reportId?: string | null;
  targetType: string;
  targetId: string;
  moderatorId: string;
  actionTaken: string;
  note?: string | null;
};

export async function createModerationCase({
  actionTaken,
  moderatorId,
  note,
  reportId,
  targetId,
  targetType
}: CreateModerationCaseInput) {
  const db = await createClient();
  const { error } = await db.from("moderation_cases").insert({
    report_id: reportId ?? null,
    target_type: targetType,
    target_id: targetId,
    moderator_id: moderatorId,
    status: "resolved",
    action_taken: actionTaken,
    internal_note: note?.trim() || "Created from admin content review."
  });

  if (error) {
    throw new Error(error.message);
  }
}
