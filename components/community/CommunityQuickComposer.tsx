import Link from "next/link";
const composerItems: {
  label: string;
  href: string;
}[] = [
  { label: "Thảo luận", href: "/community/new?type=discussion" },
  { label: "Review", href: "/community/new?type=review" },
  { label: "Poll", href: "/community/new?type=poll" },
  { label: "Challenge", href: "/community/new?type=challenge" }
];

type CommunityQuickComposerProps = {
  isLoggedIn: boolean;
};

export function CommunityQuickComposer({ isLoggedIn }: CommunityQuickComposerProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-zinc-100">Bạn muốn đăng gì?</p>
        <Link
          className="shrink-0 text-xs font-bold text-cyan-300 hover:text-cyan-200"
          href={isLoggedIn ? "/community/new" : "/login?next=/community/new"}
        >
          Tạo bài
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {composerItems.map((item) => (
          <Link
            className="tap-highlight flex min-h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-center text-sm font-bold text-zinc-100 transition hover:border-cyan-300/30 hover:bg-cyan-300/8 hover:text-cyan-100"
            href={
              isLoggedIn ? item.href : `/login?next=${encodeURIComponent(item.href)}`
            }
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
