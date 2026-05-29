"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import {
  messageActionEmptyState,
  startMessageFromProfileAction,
  type MessageActionState
} from "@/lib/actions/messages";

const CLOSED_LABEL = "Người dùng này chưa mở nhận tin nhắn.";

type StartMessageButtonProps = {
  recipientId: string;
  canShowButton: boolean;
  canMessage: boolean;
  mode: "direct" | "request" | null;
  reason: string | null;
  loginRequired: boolean;
  returnTo: string;
};

export function StartMessageButton({
  recipientId,
  canShowButton,
  canMessage,
  mode,
  reason,
  loginRequired,
  returnTo
}: StartMessageButtonProps) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [forceWarning, setForceWarning] = useState(false);
  const [warningHidden, setWarningHidden] = useState(false);
  const [state, formAction, pending] = useActionState<MessageActionState, FormData>(
    startMessageFromProfileAction,
    messageActionEmptyState
  );

  useEffect(() => {
    if (state.ok && !open) return;
    if (state.ok) {
      setOpen(false);
    }
  }, [state.ok, open]);

  if (loginRequired) {
    return (
      <Link
        className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 text-sm font-semibold text-cyan-100"
        href={`/login?next=${encodeURIComponent(returnTo)}`}
      >
        Nhắn tin
      </Link>
    );
  }

  if (!canShowButton) {
    const closed =
      reason === CLOSED_LABEL || reason?.includes("chưa mở nhận tin nhắn");
    if (closed || reason) {
      return (
        <span
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-3 text-center text-xs text-zinc-500"
          title={reason ?? CLOSED_LABEL}
        >
          {reason ?? CLOSED_LABEL}
        </span>
      );
    }
    return null;
  }

  if (!canMessage && reason) {
    return (
      <span className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-amber-400/20 bg-amber-400/8 px-3 text-center text-xs text-amber-200/90">
        {reason}
      </span>
    );
  }

  return (
    <>
      <Button
        className="min-h-11 flex-1 normal-case tracking-normal"
        onClick={() => setOpen(true)}
        type="button"
        variant="secondary"
      >
        Nhắn tin
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <form
            action={formAction}
            className="w-full max-w-md space-y-3 rounded-2xl border border-white/10 bg-[#121820] p-4 shadow-xl"
          >
            <h3 className="text-base font-bold text-white">
              {mode === "request" ? "Yêu cầu nhắn tin" : "Nhắn tin"}
            </h3>
            {mode === "request" ? (
              <p className="text-xs text-zinc-500">
                Tin nhắn đầu tiên sẽ nằm trong mục Yêu cầu của người nhận cho đến khi
                được chấp nhận.
              </p>
            ) : null}
            <input name="recipientId" type="hidden" value={recipientId} />
            <input name="returnTo" type="hidden" value={returnTo} />
            <input name="forceWarning" type="hidden" value={forceWarning ? "true" : "false"} />
            <textarea
              autoFocus
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-cyan-400/40 focus:outline-none"
              maxLength={1000}
              name="body"
              onChange={(e) => setBody(e.target.value)}
              placeholder="Nhắn tin..."
              required
              rows={4}
              value={body}
            />
            {state.error ? <p className="text-xs text-red-400">{state.error}</p> : null}
            {state.warning && !forceWarning && !warningHidden ? (
              <div className="flex flex-wrap gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 p-2">
                <p className="w-full text-xs text-amber-100">{state.warning}</p>
                <Button
                  className="min-h-8 flex-1 normal-case tracking-normal"
                  onClick={() => setWarningHidden(true)}
                  type="button"
                  variant="ghost"
                >
                  Chỉnh lại
                </Button>
                <Button
                  className="min-h-8 flex-1 normal-case tracking-normal"
                  onClick={() => setForceWarning(true)}
                  type="submit"
                  variant="secondary"
                >
                  Vẫn gửi
                </Button>
              </div>
            ) : null}
            <div className="flex gap-2">
              <Button
                className="flex-1 normal-case tracking-normal"
                onClick={() => setOpen(false)}
                type="button"
                variant="ghost"
              >
                Huỷ
              </Button>
              <Button
                className="flex-1 normal-case tracking-normal"
                disabled={!body.trim()}
                loading={pending}
                type="submit"
              >
                Gửi
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
