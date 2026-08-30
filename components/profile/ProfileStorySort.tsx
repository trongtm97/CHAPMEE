import Link from "next/link";
import { getProfileTabUrl } from "@/lib/profile/profile-url";
import type { PublicWorksSort } from "@/types/public-profile";

const SORT_OPTIONS: { value: PublicWorksSort; label: string }[] = [
  { value: "updated", label: "Mới cập nhật" },
  { value: "published", label: "Mới đăng" },
  { value: "popular", label: "Nổi bật" }
];

type ProfileStorySortProps = {
  username: string;
  activeSort: PublicWorksSort;
  page: number;
};

export function ProfileStorySort({ activeSort, page, username }: ProfileStorySortProps) {
  return (
    <div className="flex flex-wrap gap-1.5 pb-1">
      {SORT_OPTIONS.map((option) => {
        const active = option.value === activeSort;
        return (
          <Link
            className={`tap-highlight inline-flex h-8 items-center rounded-full border px-2.5 text-[0.72rem] font-semibold transition ${
              active
                ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
                : "border-white/10 bg-white/[0.02] text-zinc-500 hover:text-zinc-300"
            }`}
            href={
              getProfileTabUrl(username, "stories", page > 1 ? 1 : undefined, {
                sort: option.value
              }) ?? "#"
            }
            key={option.value}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
