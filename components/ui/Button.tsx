import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
  children: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-cyan-300 text-zinc-950 shadow-[0_14px_30px_rgba(103,232,249,0.18)] hover:bg-cyan-200 active:bg-cyan-100",
  secondary:
    "border border-white/10 bg-white/[0.05] text-zinc-100 hover:border-white/20 hover:bg-white/[0.08] active:bg-white/[0.1]",
  ghost:
    "border border-transparent bg-transparent text-zinc-300 hover:border-white/10 hover:bg-white/[0.05] hover:text-white",
  danger:
    "bg-red-500 text-white shadow-[0_14px_32px_rgba(239,68,68,0.18)] hover:bg-red-400"
};

export function Button({
  className = "",
  variant = "primary",
  loading = false,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={`tap-highlight inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-55 ${variantClasses[variant]} ${className}`}
      disabled={isDisabled}
      type={type}
      {...props}
    >
      {loading ? "Loading..." : children}
    </button>
  );
}
