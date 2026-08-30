import Link from "next/link";
import { Button } from "@/components/ui";
import { followUserAction } from "@/lib/actions/followUser";

type UserFollowButtonProps = {
  followingId: string;
  username: string;
  isFollowing: boolean;
  isLoggedIn: boolean;
  allowFollow: boolean;
  isOwner: boolean;
  returnTo: string;
  buttonClassName?: string;
};

export function UserFollowButton({
  allowFollow,
  buttonClassName,
  followingId,
  isFollowing,
  isLoggedIn,
  isOwner,
  returnTo,
  username
}: UserFollowButtonProps) {
  if (isOwner) {
    return null;
  }

  if (!allowFollow) {
    return (
      <p className="text-center text-xs text-zinc-500">
        Người dùng này không nhận theo dõi.
      </p>
    );
  }

  if (!isLoggedIn) {
    return (
      <Link
        className={
          buttonClassName ??
          "inline-flex h-9 w-full items-center justify-center rounded-full bg-cyan-300 px-4 text-sm font-semibold text-zinc-950"
        }
        href={`/login?next=${encodeURIComponent(returnTo)}`}
      >
        Theo dõi
      </Link>
    );
  }

  return (
    <form
      action={async () => {
        "use server";
        await followUserAction({
          followingId,
          following: !isFollowing,
          returnTo,
          username
        });
      }}
    >
      <Button
        className={`h-9 w-full normal-case tracking-normal ${buttonClassName ?? ""}`}
        type="submit"
        variant={isFollowing ? "secondary" : "primary"}
      >
        {isFollowing ? "Đang theo dõi" : "Theo dõi"}
      </Button>
    </form>
  );
}
