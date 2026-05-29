import Link from "next/link";

type CommunityCreateCTAProps = {
  isLoggedIn: boolean;
};

export function CommunityCreateCTA({ isLoggedIn }: CommunityCreateCTAProps) {
  return (
    <Link
      className="tap-highlight inline-flex min-h-12 w-full items-center justify-center rounded-full bg-cyan-300 px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-zinc-950 shadow-[0_14px_30px_rgba(103,232,249,0.18)] transition hover:bg-cyan-200 sm:w-auto"
      href={isLoggedIn ? "/community/new" : "/login?next=/community/new"}
    >
      Tạo bài cộng đồng
    </Link>
  );
}
