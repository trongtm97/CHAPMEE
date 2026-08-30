import Link from "next/link";
import { getStoryGroupHref } from "@/lib/community/story-group-routes";

type CommunityGroupLinkProps = {
  storySlug: string;
  className?: string;
  label?: string;
};

export function CommunityGroupLink({
  className = "text-sm font-semibold text-cyan-300 hover:text-cyan-200",
  label = "Cộng đồng truyện",
  storySlug
}: CommunityGroupLinkProps) {
  return (
    <Link className={className} href={getStoryGroupHref({ slug: storySlug })}>
      {label} →
    </Link>
  );
}
