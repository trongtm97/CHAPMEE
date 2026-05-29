import Link from "next/link";
import { CommunityPostReviewCard } from "@/components/admin/community/CommunityPostReviewCard";
import { EmptyState, SectionHeader } from "@/components/ui";
import type {
  CommunityPostForReview,
  CommunityReviewStatus
} from "@/lib/admin/getPendingCommunityPosts";

type PendingCommunityPostsProps = {
  posts: CommunityPostForReview[];
  status: CommunityReviewStatus;
};

const filterLinks: Array<{ label: string; status: CommunityReviewStatus }> = [
  { label: "Pending", status: "pending" },
  { label: "Rejected", status: "rejected" },
  { label: "Hidden", status: "hidden" }
];

export function PendingCommunityPosts({
  posts,
  status
}: PendingCommunityPostsProps) {
  return (
    <section className="space-y-4">
      <SectionHeader
        subtitle="Approve bai hop le de xuat hien cong khai, hoac reject de giu ngoai Community feed."
        title="Community Posts"
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filterLinks.map((filter) => {
          const isActive = filter.status === status;

          return (
            <Link
              className={`inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "border-cyan-300 bg-cyan-300 text-zinc-950"
                  : "border-zinc-800 bg-zinc-900 text-zinc-200 hover:border-cyan-300/60"
              }`}
              href={`/admin/community?status=${filter.status}`}
              key={filter.status}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      {posts.length ? (
        <div className="space-y-3">
          {posts.map((post) => (
            <CommunityPostReviewCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <EmptyState
          description="Khong co bai cong dong nao trong filter nay."
          title="Hàng đợi trống"
        />
      )}
    </section>
  );
}
