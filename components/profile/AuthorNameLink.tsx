"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { VerifiedName } from "@/components/profile/VerifiedBadge";
import { getCreatorPublicHref } from "@/lib/profile/profile-url";
import type { PublicVerificationBadge } from "@/types/verification";

type AuthorNameLinkProps = {
  username?: string | null;
  userId?: string | null;
  name: string;
  badge?: PublicVerificationBadge | null;
  className?: string;
  nameClassName?: string;
  onClick?: (event: MouseEvent) => void;
  /** Set false when rendered inside another link (e.g. story card). */
  linkToProfile?: boolean;
};

export function AuthorNameLink({
  username,
  userId,
  name,
  badge,
  className,
  nameClassName,
  onClick,
  linkToProfile = true
}: AuthorNameLinkProps) {
  const href = getCreatorPublicHref({ username, userId });
  const label = (
    <VerifiedName
      badge={badge}
      className={className}
      name={name}
      nameClassName={nameClassName}
    />
  );

  if (!href || !linkToProfile) {
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
