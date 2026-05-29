import { notFound, redirect } from "next/navigation";
import { ErrorState } from "@/components/ui";
import { getCommunityGroupById } from "@/lib/community/get-community-groups";

export const dynamic = "force-dynamic";

type CommunityGroupDetailPageProps = {
  params: Promise<{ groupId: string }>;
};

export default async function CommunityGroupDetailPage({ params }: CommunityGroupDetailPageProps) {
  const { groupId } = await params;
  const { group, error } = await getCommunityGroupById(groupId);

  if (error) {
    return (
      <section className="page-stack max-w-2xl">
        <ErrorState message={error} title="Không thể tải nhóm" />
      </section>
    );
  }

  if (!group) {
    notFound();
  }

  redirect(`/community/story/${group.slug}`);
}
