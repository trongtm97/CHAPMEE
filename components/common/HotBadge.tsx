type HotBadgeProps = {
  /** inline: cạnh label (chip, nav). corner: góc card shortcut. */
  variant?: "inline" | "corner";
  className?: string;
};

const VARIANT_CLASS = {
  inline:
    "shrink-0 text-[0.625rem] font-bold uppercase leading-none tracking-[0.06em] text-orange-300",
  corner:
    "shrink-0 rounded bg-orange-500/30 px-1.5 py-0.5 text-[0.5625rem] font-bold uppercase leading-none tracking-[0.05em] text-orange-200"
} as const;

export function HotBadge({ variant = "inline", className = "" }: HotBadgeProps) {
  return (
    <span aria-hidden="true" className={`${VARIANT_CLASS[variant]} ${className}`.trim()}>
      Hot
    </span>
  );
}
