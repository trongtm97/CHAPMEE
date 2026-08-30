import Link from "next/link";
import { Button } from "@/components/ui";
import { followCreatorAction } from "@/lib/actions/followCreator";

type CreatorFollowButtonProps = {
  creatorId: string;
  isFollowing: boolean;
  isLoggedIn: boolean;
  returnTo: string;
  buttonClassName?: string;
};

export function CreatorFollowButton({
  buttonClassName,
  creatorId,
  isFollowing,
  isLoggedIn,
  returnTo
}: CreatorFollowButtonProps) {
  if (!isLoggedIn) {
    return (
      <Link
        className={
          buttonClassName ??
          "inline-flex h-9 w-full items-center justify-center rounded-full bg-cyan-300 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200"
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
        await followCreatorAction({
          creatorId,
          following: !isFollowing,
          returnTo
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
