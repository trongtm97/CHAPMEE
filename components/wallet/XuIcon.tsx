import type { HTMLAttributes } from "react";

type XuIconProps = HTMLAttributes<HTMLSpanElement> & {
  size?: "sm" | "md" | "lg";
};

const sizeClasses: Record<NonNullable<XuIconProps["size"]>, string> = {
  sm: "h-6 w-6 text-[0.58rem]",
  md: "h-8 w-8 text-[0.72rem]",
  lg: "h-10 w-10 text-sm"
};

export function XuIcon({ className = "", size = "md", ...props }: XuIconProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-amber-300/35 bg-[radial-gradient(circle_at_30%_30%,rgba(253,230,138,0.9),rgba(245,158,11,0.86)_58%,rgba(180,83,9,0.92))] font-black tracking-[0.08em] text-zinc-950 shadow-[0_8px_18px_rgba(245,158,11,0.2)] ${sizeClasses[size]} ${className}`}
      {...props}
    >
      Xu
    </span>
  );
}
