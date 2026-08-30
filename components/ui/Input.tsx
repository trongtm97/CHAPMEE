import { useId, type InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  labelRequired?: boolean;
  error?: string;
};

export function Input({
  className = "",
  error,
  id,
  label,
  labelRequired = false,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="space-y-2">
      {label ? (
        <label
          className="block text-sm font-bold text-zinc-200"
          htmlFor={inputId}
        >
          {label}
          {labelRequired ? <span className="text-red-300"> *</span> : null}
        </label>
      ) : null}
      <input
        aria-describedby={errorId}
        aria-invalid={error ? true : undefined}
        className={`min-h-12 w-full rounded-full border bg-white/[0.04] px-4 py-3 text-base text-white outline-none transition placeholder:text-zinc-500 focus:border-cyan-300 focus:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60 ${
          error ? "border-red-400" : "border-white/10"
        } ${className}`}
        id={inputId}
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
