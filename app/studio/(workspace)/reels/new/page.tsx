import { SectionHeader, ErrorState } from "@/components/ui";

import { ReelsEditor } from "@/components/studio/reels/ReelsEditor";

import { getStudioAccess } from "@/lib/creator/getStudioAccess";

import { getCreatorStoriesForReels } from "@/lib/reels/get-reels-form-data";

import { createReelsItemAction } from "@/lib/reels/reels-actions";

import { studioReelsPath } from "@/lib/routes/reels-paths";



export const dynamic = "force-dynamic";



export default async function StudioNewReelsPage() {

  const basePath = studioReelsPath("/new");

  const { creatorProfile, error } = await getStudioAccess(basePath);



  if (error || !creatorProfile) {

    return (

      <section className="space-y-6">

        <SectionHeader title="Tạo Reels" />

        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />

      </section>

    );

  }



  const storiesResult = await getCreatorStoriesForReels(creatorProfile);



  return (

    <section className="space-y-6">

      <SectionHeader

        subtitle="Tạo đoạn trích ngắn từ chương để kéo độc giả vào truyện."

        title="Tạo Reels"

      />



      {storiesResult.error ? (

        <ErrorState message={storiesResult.error} title="Không tải được danh sách truyện" />

      ) : null}



      <ReelsEditor

        action={createReelsItemAction}

        authorName={creatorProfile.display_name}

        mode="create"

        stories={storiesResult.stories}

      />

    </section>

  );

}

