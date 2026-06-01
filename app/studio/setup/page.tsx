import { redirect } from "next/navigation";
import { CreatorSetupForm } from "@/components/creator/CreatorSetupForm";
import { ErrorState } from "@/components/ui";
import { STUDIO_PAGE_WIDTH_CLASS, STUDIO_FULL_NAME, STUDIO_TAGLINE } from "@/lib/studio/constants";
import { getCurrentCreatorProfile } from "@/lib/creator/getCreatorProfile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function StudioSetupPage() {
  const { creatorProfile, error, user } = await getCurrentCreatorProfile();
  const supabase = await createClient();
  const { data: profile } = user
    ? await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle()
    : { data: null };

  if (!user && !error) {
    redirect("/login?next=/studio/setup");
  }

  if (creatorProfile) {
    redirect("/studio");
  }

  return (
    <section className={`${STUDIO_PAGE_WIDTH_CLASS} space-y-6 px-4 py-8 sm:px-0`}>
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-300">
          {STUDIO_FULL_NAME}
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-normal text-white">
          Bật quyền viết truyện
        </h1>
        <p className="mt-4 text-base leading-7 text-zinc-300">{STUDIO_TAGLINE}</p>
      </div>

      {error ? (
        <ErrorState message={error} title="Không tải được thiết lập Studio" />
      ) : (
        <CreatorSetupForm defaultDisplayName={profile?.display_name} />
      )}
    </section>
  );
}
