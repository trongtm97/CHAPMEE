import type { HTMLAttributes, ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  children: ReactNode;
};

const variantClasses: Record<BadgeVariant, string> = {
  default: "border-white/10 bg-white/[0.05] text-zinc-200",
  success: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  warning: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  danger: "border-red-400/25 bg-red-400/10 text-red-300"
};

export function Badge({
  children,
  className = "",
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border px-2.5 py-1 text-center text-[0.68rem] font-bold uppercase leading-tight tracking-[0.1em] ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
