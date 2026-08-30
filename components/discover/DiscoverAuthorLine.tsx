import { AuthorNameLink } from "@/components/profile/AuthorNameLink";

type DiscoverAuthorLineProps = {
  creatorName: string | null;
  creatorUsername: string | null;
  genreName?: string | null;
  className?: string;
  /** Story cards wrap the whole row in a link — author name must stay plain text. */
  linkAuthor?: boolean;
};

export function DiscoverAuthorLine({
  creatorName,
  creatorUsername,
  genreName,
  className = "mt-1 truncate text-xs font-medium text-zinc-400",
  linkAuthor = false
}: DiscoverAuthorLineProps) {
  return (
    <p className={className}>
      <AuthorNameLink
        linkToProfile={linkAuthor}
        name={creatorName ?? "Tác giả ChapMee"}
        nameClassName="text-zinc-400"
        username={creatorUsername}
      />
      {genreName ? <span className="text-zinc-500"> / {genreName}</span> : null}
    </p>
  );
}
