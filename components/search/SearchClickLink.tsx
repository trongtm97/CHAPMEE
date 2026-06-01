"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type SearchClickLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  query: string;
  requestId: string;
  algorithmVersion: string;
  resultType: string;
  itemId: string;
  position: number;
};

export function SearchClickLink({
  href,
  children,
  className,
  query,
  requestId,
  algorithmVersion,
  resultType,
  itemId,
  position
}: SearchClickLinkProps) {
  return (
    <Link
      className={className}
      href={href}
      onClick={() => {
        void fetch("/api/search/click", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            requestId,
            algorithmVersion,
            resultType,
            itemId,
            position
          })
        });
      }}
    >
      {children}
    </Link>
  );
}
