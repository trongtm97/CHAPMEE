"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { MessageToast } from "@/components/messages/MessageToast";
import {
  messageActionEmptyState,
  sendMessageAction,
  type MessageActionState
} from "@/lib/actions/messages";
import { createOptimisticMessage } from "@/lib/messages/realtime";
import { mapMessageRow } from "@/lib/messages/map-message-row";
import type { ConversationMessage } from "@/types/messages";

const SEND_ERROR_TOAST = "Không gửi được tin nhắn. Vui lòng thử lại.";
const MAX_TEXTAREA_LINES = 4;
const LINE_HEIGHT_PX = 22;

const KNOWN_ERROR_FRAGMENTS = [
  "quá nhanh",
  "không phù hợp",
  "liên kết",
  "nhiều lần",
  "thay đổi tin nhắn",
  "tin nhắn đầu tiên"
];

type MessageComposerProps = {
  conversationId: string;
  currentUserId: string;
  disabledReason?: string | null;
  onOptimistic: (message: ConversationMessage) => void;
  onConfirmed: (tempId: string, message: ConversationMessage) => void;
  onFailed: (tempId: string) => void;
  onRemoveOptimistic: (tempId: string) => void;
  onSendSuccess?: () => void;
  prefillBody?: string | null;
  onPrefillConsumed?: () => void;
};

function useVisualViewportOffset() {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const gap = window.innerHeight - vv.height - vv.offsetTop;
      setOffset(gap > 0 ? gap : 0);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return offset;
}

export function MessageComposer({
  conversationId,
  currentUserId,
  disabledReason = null,
  onOptimistic,
  onConfirmed,
  onFailed,
  onRemoveOptimistic,
  onSendSuccess,
  prefillBody,
  onPrefillConsumed
}: MessageComposerProps) {
  const isDisabled = Boolean(disabledReason);
  const [body, setBody] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [forceWarning, setForceWarning] = useState(false);
  const [warningHidden, setWarningHidden] = useState(false);
  const [pending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const keyboardOffset = useVisualViewportOffset();

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = LINE_HEIGHT_PX * MAX_TEXTAREA_LINES + 20;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, []);

  useEffect(() => {
    if (prefillBody) {
      setBody(prefillBody);
      onPrefillConsumed?.();
    }
  }, [prefillBody, onPrefillConsumed]);

  useEffect(() => {
    resizeTextarea();
  }, [body, resizeTextarea]);

  const submitMessage = (force: boolean) => {
    const trimmed = body.trim();
    if (!trimmed || pending) {
      return;
    }

    setInlineError(null);
    setToast(null);

    const tempId = `temp-${crypto.randomUUID()}`;
    let addedOptimistic = false;

    if (!warning || force) {
      onOptimistic(createOptimisticMessage(tempId, currentUserId, trimmed));
      addedOptimistic = true;
      setBody("");
      setWarning(null);
      setWarningHidden(false);
      setForceWarning(false);
    }

    const formData = new FormData();
    formData.set("conversationId", conversationId);
    formData.set("body", trimmed);
    formData.set("forceWarning", force ? "true" : "false");

    startTransition(async () => {
      const result: MessageActionState = await sendMessageAction(
        messageActionEmptyState,
        formData
      );

      if (result.warning) {
        if (addedOptimistic) {
          onRemoveOptimistic(tempId);
          setBody(trimmed);
        }
        setWarning(result.warning);
        setForceWarning(false);
        setWarningHidden(false);
        return;
      }

      if (result.error || !result.ok) {
        if (addedOptimistic) {
          onFailed(tempId);
        }
        const err = result.error ?? SEND_ERROR_TOAST;
        setInlineError(err);
        const isKnown = KNOWN_ERROR_FRAGMENTS.some((frag) => err.includes(frag));
        setToast(isKnown ? err : SEND_ERROR_TOAST);
        if (!addedOptimistic) {
          setBody(trimmed);
        }
        return;
      }

      if (result.messageId && addedOptimistic) {
        const serverMessage = mapMessageRow(
          {
            id: result.messageId,
            sender_id: currentUserId,
            body: trimmed,
            body_safety_status: "clean",
            created_at: new Date().toISOString(),
            deleted_at: null,
            status: "sent"
          },
          currentUserId,
          false
        );
        if (serverMessage) {
          onConfirmed(tempId, serverMessage);
        }
      }

      onSendSuccess?.();
    });
  };

  if (isDisabled) {
    return (
      <div className="shrink-0 border-t border-white/10 bg-[#0b1016]/98 px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] text-center text-sm text-zinc-500">
        {disabledReason}
      </div>
    );
  }

  return (
    <>
      <form
        className="shrink-0 border-t border-white/10 bg-[#0b1016]/98 px-3 pt-2.5 backdrop-blur-md"
        onSubmit={(e) => {
          e.preventDefault();
          submitMessage(forceWarning);
        }}
        style={{
          paddingBottom: `calc(env(safe-area-inset-bottom) + 0.75rem + ${keyboardOffset}px)`
        }}
      >
        {warning && !forceWarning && !warningHidden ? (
          <div className="mb-2 flex flex-wrap gap-2 rounded-xl border border-amber-400/25 bg-amber-400/8 px-3 py-2">
            <p className="w-full text-xs leading-relaxed text-amber-100/95">{warning}</p>
            <Button
              className="min-h-9 flex-1 px-3 text-xs normal-case tracking-normal"
              onClick={() => {
                setWarningHidden(true);
                setWarning(null);
              }}
              type="button"
              variant="ghost"
            >
              Chỉnh lại
            </Button>
            <Button
              className="min-h-9 flex-1 px-3 text-xs normal-case tracking-normal"
              onClick={() => {
                setForceWarning(true);
                submitMessage(true);
              }}
              type="button"
              variant="secondary"
            >
              Vẫn gửi
            </Button>
          </div>
        ) : null}
        {inlineError ? (
          <p className="mb-2 text-xs text-red-400" role="alert">
            {inlineError}
          </p>
        ) : null}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            aria-label="Nội dung tin nhắn"
            className="min-h-11 w-full max-h-[calc(22px*4+1.25rem)] resize-none overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.05] px-3.5 py-2.5 text-sm leading-[22px] text-white placeholder:text-zinc-500 focus:border-cyan-400/40 focus:outline-none focus:ring-1 focus:ring-cyan-400/20"
            maxLength={1000}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.shiftKey) return;
              if (!window.matchMedia("(min-width: 1024px)").matches) return;
              e.preventDefault();
              if (body.trim() && !pending) {
                submitMessage(forceWarning);
              }
            }}
            placeholder="Nhắn tin..."
            rows={1}
            value={body}
          />
          <Button
            aria-label="Gửi tin nhắn"
            className="mb-0.5 min-h-11 min-w-11 shrink-0 rounded-2xl px-0 normal-case tracking-normal sm:min-w-[4.5rem] sm:px-4"
            disabled={!body.trim() || pending}
            loading={pending}
            type="submit"
          >
            <span className="hidden sm:inline">Gửi</span>
            <SendIcon className="size-5 sm:hidden" />
          </Button>
        </div>
      </form>
      <MessageToast message={toast} onDismiss={() => setToast(null)} />
    </>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={className ?? "size-5"} fill="none" viewBox="0 0 24 24">
      <path
        d="M5 12l14-7-4 7 4 7-14-7z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
