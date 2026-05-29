import Link from "next/link";
import { AvatarFallback } from "@/components/ui/AvatarFallback";

type SwipeCreatorAvatarProps = {
  avatarUrl: string | null;
  creatorHref: string;
  creatorName: string;
  disabled?: boolean;
  following: boolean;
  onFollow: () => void;
  showFollow: boolean;
};

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 24 24">
      <path
        d="m5 12 4.5 4.5L19 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function SwipeCreatorAvatar({
  avatarUrl,
  creatorHref,
  creatorName,
  disabled = false,
  following,
  onFollow,
  showFollow
}: SwipeCreatorAvatarProps) {
  return (
    <div className="relative">
      <Link className="tap-highlight block" href={creatorHref}>
        <AvatarFallback
          className="ring-2 ring-white/10 shadow-[0_14px_28px_rgba(0,0,0,0.26)]"
          name={creatorName}
          size="md"
          src={avatarUrl}
        />
      </Link>

      {showFollow ? (
        <button
          className={`tap-highlight absolute -bottom-1 left-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border border-[#081118] shadow-[0_8px_18px_rgba(0,0,0,0.36)] transition ${
            following ? "bg-white text-[#081118]" : "bg-[#ff3b6b] text-white"
          }`}
          disabled={disabled}
          onClick={onFollow}
          type="button"
        >
          {following ? <CheckIcon /> : <PlusIcon />}
        </button>
      ) : null}
    </div>
  );
}
