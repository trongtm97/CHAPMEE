import Link from "next/link";
import { redirect } from "next/navigation";
import { CommunityPostForm } from "@/components/community/CommunityPostForm";
import { ErrorState, SectionHeader } from "@/components/ui";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { getStoriesForCommunityPost } from "@/lib/community/getStoriesForCommunityPost";

export const dynamic = "force-dynamic";

type NewCommunityPostPageProps = {
  searchParams: Promise<{ type?: string }>;
};

export default async function NewCommunityPostPage({
  searchParams
}: NewCommunityPostPageProps) {
  const { type } = await searchParams;
  const { error, user } = await getCurrentProfile();

  if (!user && !error) {
    redirect("/login?next=/community/new");
  }

  if (error || !user) {
    return (
      <section className="space-y-6">
        <SectionHeader title="Tạo bài cộng đồng" />
        <ErrorState message={error} title="Không thể tạo bài" />
      </section>
    );
  }

  const stories = await getStoriesForCommunityPost();

  return (
    <section className="space-y-6">
      <Link
        className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
        href="/community"
      >
        Quay về Cộng đồng
      </Link>
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-cyan-300">
          Cộng đồng
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal">
          Tạo bài cộng đồng
        </h1>
        <p className="mt-4 text-sm leading-6 text-zinc-400">
          Bài text-only sẽ chờ duyệt trước khi hiển thị công khai.
        </p>
      </div>

      {stories.error ? (
        <ErrorState
          message={stories.error}
          title="Không thể tải danh sách truyện"
        />
      ) : null}

      <CommunityPostForm defaultType={type} stories={stories.stories} />
    </section>
  );
}
