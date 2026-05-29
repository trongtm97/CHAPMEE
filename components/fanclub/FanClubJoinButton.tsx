"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import { joinFanClubAction } from "@/lib/monetization/fan-club";

const initialState = { ok: false, error: null as string | null };

async function joinAction(_prev: typeof initialState, formData: FormData) {
  return joinFanClubAction({ planId: String(formData.get("plan_id") ?? "") });
}

type FanClubJoinButtonProps = { planId: string };

export function FanClubJoinButton({ planId }: FanClubJoinButtonProps) {
  const [state, action, pending] = useActionState(joinAction, initialState);

  return (
    <form action={action} className="space-y-1">
      <input name="plan_id" type="hidden" value={planId} />
      <Button loading={pending} type="submit">Tham gia Fan Club</Button>
      {state.error ? <p className="text-sm text-red-300">{state.error}</p> : null}
      {state.ok ? <p className="text-sm text-emerald-300">Tham gia thành công.</p> : null}
    </form>
  );
}
