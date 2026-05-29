import { useId, type TextareaHTMLAttributes } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
};

export function Textarea({
  className = "",
  error,
  id,
  label,
  rows = 4,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const errorId = error ? `${textareaId}-error` : undefined;

  return (
    <div className="space-y-2">
      {label ? (
        <label
          className="block text-sm font-bold text-zinc-200"
          htmlFor={textareaId}
        >
          {label}
        </label>
      ) : null}
      <textarea
        aria-describedby={errorId}
        aria-invalid={error ? true : undefined}
        className={`w-full resize-y rounded-2xl border bg-white/[0.04] px-4 py-3 text-base leading-7 text-white outline-none transition placeholder:text-zinc-500 focus:border-cyan-300 focus:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60 ${
          error ? "border-red-400" : "border-white/10"
        } ${className}`}
        id={textareaId}
        rows={rows}
        {...props}
      />
      {error ? (
        <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
