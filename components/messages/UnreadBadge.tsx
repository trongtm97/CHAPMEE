import { formatUnreadBadge } from "@/lib/messages/format-unread-badge";

type UnreadBadgeProps = {
  count: number;
  className?: string;
  /** Dot nhỏ trên icon (không hiện số) */
  dotOnly?: boolean;
};

export function UnreadBadge({ count, className = "", dotOnly = false }: UnreadBadgeProps) {
  const label = formatUnreadBadge(count);
  if (!label) {
    return null;
  }

  if (dotOnly) {
    return (
      <span
        aria-hidden="true"
        className={`absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-cyan-300 ring-2 ring-[#0b1016] ${className}`}
      />
    );
  }

  return (
    <span
      className={`inline-flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-cyan-300 px-1 text-[10px] font-black leading-none text-zinc-950 tabular-nums ${className}`}
    >
      {label}
    </span>
  );
}
