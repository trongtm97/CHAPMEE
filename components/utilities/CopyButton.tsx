"use client";

import { Check } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { COPY_FEEDBACK_MS } from "@/lib/utilities/copy-to-clipboard";

type CopyButtonVariant = "default" | "compact";

type CopyButtonProps = {
  label?: string;
  copiedLabel?: string;
  variant?: CopyButtonVariant;
  disabled?: boolean;
  className?: string;
  onCopy: () => Promise<boolean> | boolean;
};

const VARIANT_CLASSES: Record<CopyButtonVariant, string> = {
  default: "rounded-xl px-4 py-2 text-sm",
  compact: "rounded-lg px-3 py-1.5 text-xs"
};

export function CopyButton({
  label = "Sao chép",
  copiedLabel = "Đã sao chép",
  variant = "default",
  disabled = false,
  className = "",
  onCopy
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleClick = useCallback(async () => {
    const ok = await onCopy();
    if (!ok) return;

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }

    setCopied(true);
    timerRef.current = window.setTimeout(() => {
      setCopied(false);
      timerRef.current = null;
    }, COPY_FEEDBACK_MS);
  }, [onCopy]);

  return (
    <button
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${VARIANT_CLASSES[variant]} ${
        copied
          ? "border border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
          : "border border-white/10 bg-zinc-900/80 text-zinc-100 hover:border-white/20"
      } ${className}`}
      disabled={disabled || copied}
      onClick={() => void handleClick()}
      type="button"
    >
      {copied ? (
        <>
          <Check aria-hidden className="size-3.5 shrink-0 stroke-[2.5]" />
          {copiedLabel}
        </>
      ) : (
        label
      )}
    </button>
  );
}
