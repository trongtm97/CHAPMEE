import { AuthorNameLink } from "@/components/profile/AuthorNameLink";
import type { PublicVerificationBadge } from "@/types/verification";

type ReelAuthorLineProps = {
  creatorName: string | null;
  creatorHandle: string | null;
  creatorUserId: string | null;
  creatorVerification: PublicVerificationBadge | null;
  className?: string;
};

function normalizeHandle(handle: string | null) {
  const trimmed = handle?.trim().toLowerCase() ?? "";
  return trimmed.replace(/^@/, "");
}

export function formatReelAuthorDisplay(
  creatorName: string | null,
  creatorHandle: string | null
) {
  const handle = normalizeHandle(creatorHandle);
  const name = creatorName?.trim() ?? "";

  if (!handle && !name) {
    return { primary: "Tác giả ChapMee", secondary: null as string | null };
  }

  if (!handle) {
    return { primary: name, secondary: null };
  }

  if (!name || name.toLowerCase() === handle || name.toLowerCase() === `@${handle}`) {
    return { primary: `@${handle}`, secondary: null };
  }

  return { primary: name, secondary: `@${handle}` };
}

export function ReelAuthorLine({
  creatorName,
  creatorHandle,
  creatorUserId,
  creatorVerification,
  className = ""
}: ReelAuthorLineProps) {
  const { primary, secondary } = formatReelAuthorDisplay(creatorName, creatorHandle);
  const handle = normalizeHandle(creatorHandle);

  return (
    <p className={`flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-sm ${className}`.trim()}>
      <AuthorNameLink
        badge={creatorVerification}
        name={primary}
        nameClassName="font-semibold text-zinc-200"
        userId={creatorUserId}
        username={handle || null}
      />
      {secondary ? (
        <span className="text-[0.78rem] font-medium text-zinc-500">{secondary}</span>
      ) : null}
    </p>
  );
}
