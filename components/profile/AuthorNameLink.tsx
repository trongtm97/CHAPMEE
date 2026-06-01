"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { VerifiedName } from "@/components/profile/VerifiedBadge";
import { getProfileUrl } from "@/lib/profile/profile-url";
import type { PublicVerificationBadge } from "@/types/verification";

type AuthorNameLinkProps = {
  username?: string | null;
  name: string;
  badge?: PublicVerificationBadge | null;
  className?: string;
  nameClassName?: string;
  onClick?: (event: MouseEvent) => void;
};

export function AuthorNameLink({
  username,
  name,
  badge,
  className,
  nameClassName,
  onClick
}: AuthorNameLinkProps) {
  const href = getProfileUrl(username);
  const label = (
    <VerifiedName
      badge={badge}
      className={className}
      name={name}
      nameClassName={nameClassName}
    />
  );

  if (!href) {
    return label;
  }

  return (
    <Link
      className="tap-highlight inline hover:opacity-90"
      href={href}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
    >
      {label}
    </Link>
  );
}
