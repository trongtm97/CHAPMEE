"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  COMMUNITY_AUTHORS_SECTION_ID,
  getCommunityAuthorsSectionHref
} from "@/lib/community/community-author-url";

type CommunityQuickActionsProps = {
  isLoggedIn: boolean;
  onWriteClick: () => void;
};

function scrollToAuthorsSection() {
  document.getElementById(COMMUNITY_AUTHORS_SECTION_ID)?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

export function CommunityQuickActions({
  isLoggedIn,
  onWriteClick
}: CommunityQuickActionsProps) {
  const pathname = usePathname();

  return (
    <div className="grid grid-cols-3 gap-2">
      <button
        className="tap-highlight flex min-h-10 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-2 text-xs font-bold text-cyan-100"
        onClick={onWriteClick}
        type="button"
      >
        Viết bài
      </button>
      <Link
        className="tap-highlight flex min-h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-2 text-xs font-bold text-zinc-200"
        href="/community/groups"
      >
        Nhóm truyện
      </Link>
      <Link
        className="tap-highlight flex min-h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-2 text-xs font-bold text-zinc-200"
        href={getCommunityAuthorsSectionHref()}
        onClick={(event) => {
          if (pathname === "/community") {
            event.preventDefault();
            scrollToAuthorsSection();
          }
        }}
      >
        Tác giả
      </Link>
      {!isLoggedIn ? (
        <span className="col-span-3 text-center text-[0.65rem] text-zinc-600">
          Đăng nhập để đăng bài
        </span>
      ) : null}
    </div>
  );
}
