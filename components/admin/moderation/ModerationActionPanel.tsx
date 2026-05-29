"use client";

import { Button, Card } from "@/components/ui";
import { ModerationNoteForm } from "@/components/admin/moderation/ModerationNoteForm";
import { applyModerationAction } from "@/lib/admin/applyModerationAction";

type ModerationActionPanelProps = {
  reportId: string;
  targetType: string;
  status: string;
};

const actionsByTarget: Record<
  string,
  Array<{ label: string; value: string; variant?: "danger" | "secondary" }>
> = {
  comment: [{ label: "Hide comment", value: "hide_comment", variant: "danger" }],
  community_post: [
    { label: "Hide post", value: "hide_community_post", variant: "danger" }
  ],
  story: [
    { label: "Archive story", value: "archive_story", variant: "secondary" },
    { label: "Reject story", value: "reject_story", variant: "danger" }
  ],
  episode: [
    { label: "Archive episode", value: "archive_episode", variant: "secondary" },
    { label: "Reject episode", value: "reject_episode", variant: "danger" }
  ]
};

export function ModerationActionPanel({
  reportId,
  status,
  targetType
}: ModerationActionPanelProps) {
  const actions = actionsByTarget[targetType] ?? [];

  if (actions.length === 0 || (status !== "open" && status !== "reviewing")) {
    return null;
  }

  return (
    <Card className="space-y-3 border-red-400/20 bg-red-400/5">
      <div>
        <p className="text-base font-semibold text-white">Moderation action</p>
        <p className="mt-1 text-sm leading-6 text-zinc-400">
          Safe action only: updates status, records moderation case, no hard
          delete.
        </p>
      </div>
      {actions.map((action) => (
        <form
          action={applyModerationAction}
          className="space-y-3"
          key={action.value}
        >
          <input name="report_id" type="hidden" value={reportId} />
          <input name="moderation_action" type="hidden" value={action.value} />
          <ModerationNoteForm />
          <Button
            className="w-full"
            onClick={(event) => {
              if (!confirm(`Apply action: ${action.label}?`)) {
                event.preventDefault();
              }
            }}
            type="submit"
            variant={action.variant ?? "secondary"}
          >
            {action.label}
          </Button>
        </form>
      ))}
    </Card>
  );
}
