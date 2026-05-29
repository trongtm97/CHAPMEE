import Link from "next/link";
import { Button } from "@/components/ui";
import { followCreatorAction } from "@/lib/actions/followCreator";

type CreatorFollowButtonProps = {
  creatorId: string;
  isFollowing: boolean;
  isLoggedIn: boolean;
  returnTo: string;
};

export function CreatorFollowButton({
  creatorId,
  isFollowing,
  isLoggedIn,
  returnTo
}: CreatorFollowButtonProps) {
  if (!isLoggedIn) {
    return (
      <div className="space-y-2">
        <Link
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200"
          href={`/login?next=${encodeURIComponent(returnTo)}`}
        >
          Đăng nhập để theo dõi
        </Link>
      </div>
    );
  }

  return (
    <form
      action={async () => {
        "use server";
        await followCreatorAction({
          creatorId,
          following: !isFollowing,
          returnTo
        });
      }}
    >
      <Button
        className="w-full normal-case tracking-normal"
        type="submit"
        variant={isFollowing ? "secondary" : "primary"}
      >
        {isFollowing ? "Đang theo dõi" : "Theo dõi"}
      </Button>
    </form>
  );
}
