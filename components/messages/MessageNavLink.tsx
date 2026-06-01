"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UnreadBadge } from "@/components/messages/UnreadBadge";
import { useMessageUnread } from "@/components/messages/message-unread-context";

type MessageNavLinkProps = {
  href?: string;
  label?: string;
  className?: string;
  activeClassName?: string;
  inactiveClassName?: string;
};

export function MessageNavLink({
  href = "/messages",
  label = "Tin nhắn",
  className = "",
  activeClassName = "border-cyan-300/40 bg-cyan-300/12 text-cyan-100",
  inactiveClassName = "border-white/10 text-zinc-200 hover:border-cyan-300/40 hover:text-cyan-100"
}: MessageNavLinkProps) {
  const pathname = usePathname();
  const unread = useMessageUnread();
  const active = pathname.startsWith(href);
  const messageUnread = unread?.messageUnread ?? 0;

  return (
    <Link
      className={`relative inline-flex h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-sm font-semibold leading-none transition ${
        active ? activeClassName : inactiveClassName
      } ${className}`}
      href={href}
    >
      {label}
      <UnreadBadge count={messageUnread} />
    </Link>
  );
}
