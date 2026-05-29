"use client";

import { useActionState } from "react";
import { Button, Card } from "@/components/ui";
import {
  createAppealAction,
  type AppealFormState
} from "@/lib/moderation/create-appeal";

const initialState: AppealFormState = { error: null, success: null };

type AppealFormProps = {
  violationId: string;
};

export function AppealForm({ violationId }: AppealFormProps) {
  const [state, formAction, pending] = useActionState(createAppealAction, initialState);

  return (
    <Card className="space-y-3 p-4">
      <p className="text-sm font-semibold text-white">Gửi khiếu nại</p>
      <form action={formAction} className="space-y-3">
        <input name="violation_id" type="hidden" value={violationId} />
        <textarea
          className="min-h-24 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
          name="message"
          placeholder="Giải thích vì sao bạn cho rằng quyết định này nhầm (tối thiểu 20 ký tự)."
          required
        />
        {state.error ? (
          <p className="text-sm text-red-300">{state.error}</p>
        ) : null}
        {state.success ? (
          <p className="text-sm text-emerald-300">{state.success}</p>
        ) : null}
        <Button loading={pending} type="submit" variant="secondary">
          Gửi khiếu nại
        </Button>
      </form>
    </Card>
  );
}
