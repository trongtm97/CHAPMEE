"use client";

import Link from "next/link";
import { useCallback, useState, type FormEvent } from "react";
import {
  EPISODE_GUIDELINES_ACK_MESSAGE,
  GUIDELINES_ACK_MESSAGE
} from "@/lib/moderation/moderation-rules";

export function useGuidelinesSubmitGuard() {
  const [acknowledged, setAcknowledged] = useState(false);
  const [ackError, setAckError] = useState<string | null>(null);
  const [pendingIntent, setPendingIntent] = useState<"draft" | "review">("draft");

  const guardSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      setAckError(null);
      if (pendingIntent === "review" && !acknowledged) {
        event.preventDefault();
        setAckError(
          "Vui lòng tick xác nhận trước khi gửi duyệt hoặc xuất bản."
        );
      }
    },
    [acknowledged, pendingIntent]
  );

  return {
    acknowledged,
    setAcknowledged,
    ackError,
    setAckError,
    pendingIntent,
    setPendingIntent,
    guardSubmit
  };
}

type GuidelinesAcknowledgementFieldProps = {
  acknowledged: boolean;
  bare?: boolean;
  disabled?: boolean;
  error: string | null;
  onAckChange: (checked: boolean) => void;
  variant?: "story" | "episode";
};

export function GuidelinesAcknowledgementField({
  acknowledged,
  bare = false,
  disabled = false,
  error,
  onAckChange,
  variant = "story"
}: GuidelinesAcknowledgementFieldProps) {
  const message =
    variant === "episode"
      ? EPISODE_GUIDELINES_ACK_MESSAGE
      : GUIDELINES_ACK_MESSAGE;

  return (
    <div
      className={
        bare
          ? "space-y-3"
          : "space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/40 p-4"
      }
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          checked={acknowledged}
          className="mt-1 size-4 shrink-0 accent-cyan-300"
          disabled={disabled}
          name="guidelines_ack"
          onChange={(event) => onAckChange(event.target.checked)}
          type="checkbox"
          value="on"
        />
        <span className="text-sm leading-6 text-zinc-300">
          {message}{" "}
          <Link
            className="font-medium text-cyan-300 hover:text-cyan-200"
            href="/community-guidelines"
            rel="noopener noreferrer"
            target="_blank"
          >
            Quy định cộng đồng
          </Link>
          .
        </span>
      </label>
      {error ? (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
      {!bare ? (
        <p className="text-xs text-zinc-500">
          Bắt buộc khi bấm &quot;Gửi duyệt&quot;. Lưu nháp không cần tick.
        </p>
      ) : null}
    </div>
  );
}
